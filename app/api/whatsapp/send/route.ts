import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeE164, sendWhatsAppMessage } from "@/lib/whatsapp";

// Manual "Send WhatsApp" endpoint. Callable only by a logged-in user.
// Always records an activity row (sent or failed) for the lead.

export const runtime = "nodejs";

interface SendBody {
  leadId?: string;
  to?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const leadId = body.leadId;
  const message = body.message;

  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }
  if (!message || message.trim() === "") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, whatsapp, phone")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "lead not found" }, { status: 404 });
  }

  const rawRecipient = body.to || lead.whatsapp || lead.phone;
  if (!rawRecipient) {
    return NextResponse.json(
      { error: "no recipient number" },
      { status: 400 }
    );
  }

  const to = normalizeE164(rawRecipient);
  if (!to) {
    return NextResponse.json(
      { error: "no recipient number" },
      { status: 400 }
    );
  }

  const result = await sendWhatsAppMessage({ to, message });

  // Always log an activity row, regardless of success.
  const content = `WhatsApp ${result.ok ? "sent" : "failed"} to ${to}: ${message}${
    result.ok ? "" : " — " + (result.error ?? "error")
  }`;
  await supabase.from("activities").insert({
    lead_id: leadId,
    type: "whatsapp",
    content,
    created_by: user.id,
  });

  // If the API simply isn't configured, return 200 so the UI can show a
  // graceful "not configured" state instead of treating it as an error.
  if (result.status === 0 && result.error === "WhatsApp API not configured") {
    return NextResponse.json(
      {
        ok: false,
        status: result.status,
        notConfigured: true,
        error: result.error,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      ok: result.ok,
      status: result.status,
      providerId: result.providerId,
      error: result.error,
    },
    { status: result.ok ? 200 : 502 }
  );
}
