import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { applyStageTransition } from "@/lib/stage-engine";

export const runtime = "nodejs";

// Single Shopify webhook dispatcher. Verifies HMAC over the RAW body using
// SHOPIFY_WEBHOOK_SECRET, then routes by the X-Shopify-Topic header. All
// transitions go through the engine (forward-only + idempotent), so duplicate
// deliveries are safe. Always responds 200 on a valid request to avoid retries.
//
// Topics handled:
//   orders/fulfilled  → the lead whose sample_shopify_order_id matches → sample_shipped (10)
//   orders/paid       → lead by shopify_customer_id; a NON-sample paid order → converted (16)

interface ShopifyOrder {
  id?: number | string;
  admin_graphql_api_id?: string;
  name?: string;
  total_price?: string;
  created_at?: string;
  processed_at?: string;
  customer?: {
    id?: number | string;
    admin_graphql_api_id?: string;
  } | null;
}

function verifyHmac(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// All string forms an order id might take in our DB.
function orderIdCandidates(order: ShopifyOrder): string[] {
  const out: string[] = [];
  if (order.admin_graphql_api_id) out.push(order.admin_graphql_api_id);
  if (order.id != null) {
    out.push(String(order.id));
    out.push(`gid://shopify/Order/${order.id}`);
  }
  if (order.name) out.push(order.name);
  return Array.from(new Set(out));
}

function customerIdCandidates(order: ShopifyOrder): string[] {
  const c = order.customer;
  const out: string[] = [];
  if (c?.admin_graphql_api_id) out.push(c.admin_graphql_api_id);
  if (c?.id != null) {
    out.push(String(c.id));
    out.push(`gid://shopify/Customer/${c.id}`);
  }
  return Array.from(new Set(out));
}

export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    // Shopify intentionally not configured yet — no-op gracefully (never 500).
    // Once SHOPIFY_WEBHOOK_SECRET is set, this route resumes HMAC verification
    // + topic dispatch with no other change. Always 200 so nothing treats the
    // missing-config case as a server error.
    return NextResponse.json({ ok: true, ignored: "shopify_not_configured" });
  }

  const raw = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  if (!verifyHmac(raw, hmac, secret)) {
    return NextResponse.json({ error: "invalid_hmac" }, { status: 401 });
  }

  const topic = (request.headers.get("x-shopify-topic") ?? "").toLowerCase();

  let order: ShopifyOrder = {};
  try {
    order = raw ? (JSON.parse(raw) as ShopifyOrder) : {};
  } catch {
    // Valid HMAC but unparseable body — ack so Shopify doesn't retry.
    return NextResponse.json({ ok: true, ignored: "unparseable" });
  }

  const supabase = createServiceClient();

  try {
    if (topic === "orders/fulfilled" || topic === "fulfillments/create") {
      const candidates = orderIdCandidates(order);
      if (candidates.length === 0) return NextResponse.json({ ok: true, ignored: "no_order_id" });

      const { data: lead } = await supabase
        .from("leads")
        .select("id")
        .in("sample_shopify_order_id", candidates)
        .limit(1)
        .maybeSingle();

      if (!lead) return NextResponse.json({ ok: true, ignored: "no_match" });

      await applyStageTransition(supabase, {
        leadId: (lead as { id: string }).id,
        targetStage: "sample_shipped",
        reason: "Shopify fulfillment webhook",
        auto: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (topic === "orders/paid") {
      const custCandidates = customerIdCandidates(order);
      if (custCandidates.length === 0) return NextResponse.json({ ok: true, ignored: "no_customer" });

      const { data: lead } = await supabase
        .from("leads")
        .select("id, sample_shopify_order_id")
        .in("shopify_customer_id", custCandidates)
        .limit(1)
        .maybeSingle();

      if (!lead) return NextResponse.json({ ok: true, ignored: "no_match" });

      const row = lead as { id: string; sample_shopify_order_id: string | null };
      const orderCandidates = orderIdCandidates(order);

      // Ignore if the paid order IS the sample order.
      if (
        row.sample_shopify_order_id &&
        orderCandidates.includes(row.sample_shopify_order_id)
      ) {
        return NextResponse.json({ ok: true, ignored: "sample_order_paid" });
      }

      const total = order.total_price ? Number.parseFloat(order.total_price) : null;
      const at = order.processed_at || order.created_at || null;
      const convertedOrderId = order.admin_graphql_api_id || (order.id != null ? String(order.id) : null);

      await applyStageTransition(supabase, {
        leadId: row.id,
        targetStage: "converted",
        reason: "Shopify order paid",
        auto: true,
        extra: {
          converted_order_id: convertedOrderId,
          last_order_total: Number.isFinite(total) ? total : null,
          last_order_at: at,
        },
      });
      return NextResponse.json({ ok: true });
    }

    // Unhandled topic — ack so Shopify doesn't retry.
    return NextResponse.json({ ok: true, ignored: `unhandled_topic:${topic}` });
  } catch (err) {
    // Never 500 on a verified webhook (avoids aggressive retries); log instead.
    console.error("[shopify-webhook] handler error:", err);
    return NextResponse.json({ ok: true, error: "handler_error" });
  }
}
