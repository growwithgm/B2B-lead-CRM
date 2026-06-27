import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Klaviyo lead intake. This is the ONLY route that uses a secret instead of
// a user session. It is excluded from auth middleware (see middleware matcher).
//
// Security: the request MUST present KLAVIYO_WEBHOOK_SECRET, either as
//   - header:  x-webhook-secret: <secret>
//   - query:   ?secret=<secret>
// Uses a timing-safe comparison and the Supabase service-role key (server only).

export const runtime = "nodejs";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Walk a few likely locations in Klaviyo's payload to find a value.
function pick(
  obj: Record<string, any>,
  keys: string[]
): string | null {
  const buckets: Record<string, any>[] = [
    obj,
    obj?.data ?? {},
    obj?.data?.attributes ?? {},
    obj?.data?.attributes?.properties ?? {},
    obj?.properties ?? {},
    obj?.person ?? {},
    obj?.attributes ?? {},
  ];
  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue;
    for (const key of keys) {
      const v = bucket[key];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const expected = process.env.KLAVIYO_WEBHOOK_SECRET;
  if (!expected) {
    console.error("[klaviyo-webhook] KLAVIYO_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const provided =
    request.headers.get("x-webhook-secret") ??
    request.nextUrl.searchParams.get("secret") ??
    "";

  if (!timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Parse body tolerantly (JSON or form-encoded). Always log raw for mapping.
  let body: Record<string, any> = {};
  let raw = "";
  try {
    raw = await request.text();
    if (raw) {
      const ct = request.headers.get("content-type") ?? "";
      if (ct.includes("application/x-www-form-urlencoded")) {
        body = Object.fromEntries(new URLSearchParams(raw));
      } else {
        body = JSON.parse(raw);
      }
    }
  } catch {
    // Keep raw; mapping will just find nothing and return 200.
  }
  console.log("[klaviyo-webhook] raw body:", raw);

  const email = pick(body, ["email", "$email", "Email", "email_address"]);
  if (!email) {
    // Acknowledge so Klaviyo doesn't retry; log so mapping can be fixed.
    console.warn("[klaviyo-webhook] no email found in payload");
    return NextResponse.json({ ok: true, skipped: "no_email" });
  }

  const normalizedEmail = email.toLowerCase();
  const supabase = createServiceClient();

  // Dedupe on email.
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const lead = {
    email: normalizedEmail,
    contact_name: pick(body, [
      "name",
      "$first_name",
      "first_name",
      "full_name",
      "contact_name",
    ]),
    phone: pick(body, ["phone", "$phone_number", "phone_number"]),
    whatsapp: pick(body, ["whatsapp", "whatsapp_number"]),
    company_name: pick(body, [
      "company",
      "company_name",
      "$organization",
      "organization",
      "business_name",
    ]),
    vat_number: pick(body, ["vat", "vat_number", "tax_id"]),
    ship_line1: pick(body, ["address", "address1", "ship_line1", "$address1"]),
    ship_city: pick(body, ["city", "ship_city", "$city"]),
    ship_postcode: pick(body, ["postcode", "zip", "ship_postcode", "$zip"]),
    ship_country: pick(body, ["country", "ship_country", "$country"]) ?? "ES",
    brand: pick(body, ["brand"]),
    requested_products: pick(body, [
      "requested_products",
      "products",
      "message",
      "interest",
      "notes",
    ]),
    stage: "new_lead",
    source: "klaviyo",
  };

  const { error } = await supabase.from("leads").insert(lead);
  if (error) {
    console.error("[klaviyo-webhook] insert failed:", error.message);
    // Still 200 to avoid aggressive Klaviyo retries; investigate via logs.
    return NextResponse.json({ ok: false, error: error.message });
  }

  return NextResponse.json({ ok: true });
}
