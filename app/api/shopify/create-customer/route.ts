import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrFindCustomer } from "@/lib/shopify";

export const runtime = "nodejs";

interface LeadRow {
  id: string;
  email: string | null;
  contact_name: string | null;
  company_name: string | null;
  phone: string | null;
  shopify_customer_id: string | null;
}

// Best-effort split of a single contact_name into first/last names.
function splitName(name: string | null): {
  firstName: string | null;
  lastName: string | null;
} {
  if (!name) return { firstName: null, lastName: null };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") {
    return { firstName: null, lastName: null };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { leadId?: unknown } = {};
  try {
    body = (await request.json()) as { leadId?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  if (!leadId) {
    return NextResponse.json(
      { ok: false, error: "leadId is required" },
      { status: 400 }
    );
  }

  const { data: lead, error: loadError } = await supabase
    .from("leads")
    .select("id,email,contact_name,company_name,phone,shopify_customer_id")
    .eq("id", leadId)
    .maybeSingle<LeadRow>();

  if (loadError) {
    return NextResponse.json(
      { ok: false, error: loadError.message },
      { status: 500 }
    );
  }
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: "Lead not found" },
      { status: 404 }
    );
  }
  if (!lead.email) {
    return NextResponse.json(
      { ok: false, error: "Lead has no email" },
      { status: 400 }
    );
  }

  const { firstName, lastName } = splitName(lead.contact_name);

  const result = await createOrFindCustomer({
    email: lead.email,
    firstName,
    lastName,
    phone: lead.phone,
    company: lead.company_name,
  });

  // Shopify not configured → soft 200 so the UI can show a hint.
  if (!result.ok && result.error === "Shopify not configured") {
    return NextResponse.json(
      { ok: false, notConfigured: true, error: result.error },
      { status: 200 }
    );
  }

  if (!result.ok || !result.customerId) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Shopify request failed" },
      { status: 502 }
    );
  }

  const customerId = result.customerId;
  const created = result.created ?? false;

  const { error: updateError } = await supabase
    .from("leads")
    .update({ shopify_customer_id: customerId })
    .eq("id", leadId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 }
    );
  }

  await supabase.from("activities").insert({
    lead_id: leadId,
    type: "shopify",
    content: `Shopify customer ${created ? "created" : "found"}: ${customerId}`,
    created_by: user.id,
  });

  // Fully manual pipeline: creating the Shopify customer does NOT move the
  // stage. Mark "Company Account Created" by hand when ready.
  return NextResponse.json({ ok: true, customerId, created }, { status: 200 });
}
