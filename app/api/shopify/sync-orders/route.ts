import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCustomerOrders } from "@/lib/shopify";

export const runtime = "nodejs";

interface LeadRow {
  id: string;
  shopify_customer_id: string | null;
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
    .select("id,shopify_customer_id")
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
  if (!lead.shopify_customer_id) {
    return NextResponse.json(
      { ok: false, error: "Create the Shopify customer first" },
      { status: 400 }
    );
  }

  const result = await getCustomerOrders(lead.shopify_customer_id);

  // Shopify not configured → soft 200 so the UI can show a hint.
  if (!result.ok && result.error === "Shopify not configured") {
    return NextResponse.json(
      { ok: false, notConfigured: true, error: result.error },
      { status: 200 }
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Shopify request failed" },
      { status: 502 }
    );
  }

  const { orderCount, paidCount, totalSpent, lastOrderAt } = result;

  const { error: updateError } = await supabase
    .from("leads")
    .update({ last_order_total: totalSpent, last_order_at: lastOrderAt })
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
    content: `Synced Shopify orders: ${orderCount} order(s), ${paidCount} paid, total ${totalSpent}`,
    created_by: user.id,
  });

  return NextResponse.json(
    {
      ok: true,
      orderCount,
      paidCount,
      totalSpent,
      lastOrderAt,
      canMarkWon: paidCount >= 1,
    },
    { status: 200 }
  );
}
