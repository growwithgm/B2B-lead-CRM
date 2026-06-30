import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSampleDraftOrder } from "@/lib/shopify";

export const runtime = "nodejs";

interface LeadRow {
  id: string;
  email: string | null;
  shopify_customer_id: string | null;
  sample_shopify_order_id: string | null;
}

// Creates a Shopify SAMPLE order (draft order) for the lead and saves its id.
// Fully manual pipeline: this does NOT move the stage. Logged-in users only.
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
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  if (!leadId) {
    return NextResponse.json({ ok: false, error: "leadId is required" }, { status: 400 });
  }

  const { data: lead, error: loadError } = await supabase
    .from("leads")
    .select("id,email,shopify_customer_id,sample_shopify_order_id")
    .eq("id", leadId)
    .maybeSingle<LeadRow>();

  if (loadError) {
    return NextResponse.json({ ok: false, error: loadError.message }, { status: 500 });
  }
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  }

  const result = await createSampleDraftOrder({
    customerId: lead.shopify_customer_id,
    email: lead.email,
    title: "Sample pack",
  });

  if (!result.ok && result.error === "Shopify not configured") {
    return NextResponse.json(
      { ok: false, notConfigured: true, error: result.error },
      { status: 200 }
    );
  }
  if (!result.ok || !result.orderId) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Shopify request failed" },
      { status: 502 }
    );
  }

  await supabase.from("activities").insert({
    lead_id: leadId,
    type: "shopify",
    content: `Sample order created in Shopify: ${result.name ?? result.orderId}`,
    created_by: user.id,
  });

  // Save the order id. No stage change — mark "Sample Order Done" by hand.
  await supabase
    .from("leads")
    .update({ sample_shopify_order_id: result.orderId })
    .eq("id", leadId);

  return NextResponse.json(
    { ok: true, orderId: result.orderId, name: result.name },
    { status: 200 }
  );
}
