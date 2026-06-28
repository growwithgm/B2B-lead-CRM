import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyStageTransition } from "@/lib/stage-engine";
import { isStage } from "@/lib/stages";

export const runtime = "nodejs";

// Manual stage changes from the UI (drag-drop, stage dropdown, drawer buttons)
// all flow through the engine here, so the auto-advance + logging rules apply
// uniformly. Logged-in users only.
export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { leadId?: unknown; targetStage?: unknown; reason?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const targetStage = typeof body.targetStage === "string" ? body.targetStage : "";
  const reason = typeof body.reason === "string" ? body.reason : undefined;

  if (!leadId) {
    return NextResponse.json({ ok: false, error: "leadId is required" }, { status: 400 });
  }
  if (!isStage(targetStage)) {
    return NextResponse.json({ ok: false, error: "Invalid target stage" }, { status: 400 });
  }

  const result = await applyStageTransition(supabase, {
    leadId,
    targetStage,
    reason,
    auto: false, // UI changes are manual: backward + lost allowed.
    createdBy: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  // Return the fresh row so the client reflects any auto-advance.
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    changed: result.changed,
    finalStage: result.finalStage,
    lead,
  });
}
