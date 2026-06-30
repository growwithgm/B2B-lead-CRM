import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isStage, STAGE_BY_LABEL, stageLabel } from "@/lib/stages";

export const runtime = "nodejs";

// Undo a single stage change. Deliberately separate from the easy "mark stage"
// path so it can't happen by accident (the UI also makes it a 2-step action).
//
// Given a `stage_change` activity id, this reverts the lead to the stage it was
// in BEFORE that change (parsed from the activity's "From → To …" content) and
// logs a `stage_undo` activity recording what was undone. Logged-in users only.
export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { leadId?: unknown; activityId?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const activityId = typeof body.activityId === "string" ? body.activityId : "";
  if (!leadId || !activityId) {
    return NextResponse.json(
      { ok: false, error: "leadId and activityId are required" },
      { status: 400 }
    );
  }

  // Load the stage_change activity being undone (must belong to this lead).
  const { data: activity, error: actErr } = await supabase
    .from("activities")
    .select("id, lead_id, type, content")
    .eq("id", activityId)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (actErr) return NextResponse.json({ ok: false, error: actErr.message }, { status: 500 });
  if (!activity) return NextResponse.json({ ok: false, error: "Change not found" }, { status: 404 });

  const row = activity as { type: string; content: string | null };
  if (row.type !== "stage_change") {
    return NextResponse.json({ ok: false, error: "Not a stage change" }, { status: 400 });
  }

  // Parse "FromLabel → ToLabel (…)" → recover the before-stage from its label.
  const match = (row.content ?? "").match(/^(.+?)\s*→\s*(.+?)\s*\(/);
  const fromLabel = match?.[1]?.trim();
  const toLabel = match?.[2]?.trim();
  const beforeStage = fromLabel ? STAGE_BY_LABEL[fromLabel] : undefined;

  if (!beforeStage || !isStage(beforeStage)) {
    return NextResponse.json(
      { ok: false, error: "Can't undo this change (its original stage no longer exists)." },
      { status: 400 }
    );
  }

  // Revert the stage.
  const { data: lead, error: updErr } = await supabase
    .from("leads")
    .update({ stage: beforeStage, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .select("*")
    .maybeSingle();

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  if (!lead) return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });

  // Log the undo.
  await supabase.from("activities").insert({
    lead_id: leadId,
    type: "stage_undo",
    content: `Undid "${fromLabel} → ${toLabel}" — reverted to ${stageLabel(beforeStage)}`,
    created_by: user.id,
  });

  return NextResponse.json({ ok: true, lead });
}
