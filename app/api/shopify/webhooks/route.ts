import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

// Shopify webhook receiver. The pipeline is now FULLY MANUAL — there are no
// Shopify-driven stage transitions. This endpoint still verifies the HMAC (so
// it stays a proper, secure endpoint if you wire Shopify back up) and always
// acknowledges with 200, but it never moves a lead's stage.
//
// When SHOPIFY_WEBHOOK_SECRET is unset, it no-ops gracefully (never 500).

function verifyHmac(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    // Shopify intentionally not configured — no-op gracefully (never 500).
    return NextResponse.json({ ok: true, ignored: "shopify_not_configured" });
  }

  const raw = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  if (!verifyHmac(raw, hmac, secret)) {
    return NextResponse.json({ error: "invalid_hmac" }, { status: 401 });
  }

  // Verified, but the manual pipeline does not auto-transition on Shopify
  // events. Acknowledge so Shopify does not retry.
  return NextResponse.json({ ok: true, ignored: "manual_pipeline_no_auto_transition" });
}
