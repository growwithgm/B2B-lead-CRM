// Stage transition engine — the single chokepoint every stage change flows
// through (drag-drop and the stage dropdown in the lead drawer). Centralizes
// the logging rule so it can't drift.
//
// Rules (this pipeline is FULLY MANUAL — there is no auto-advance):
//  - A stage only ever changes because a person did it (drag-drop / dropdown).
//    The lead rests exactly where it is put — the engine NEVER advances a stage
//    on its own.
//  - `auto` is accepted for compatibility but no longer triggers any advance;
//    when true it only adds a forward-only / never-override-`lost` guard.
//  - Idempotent: moving to the stage we're already on is a no-op.
//  - Every real change logs a `stage_change` activity (old → new, auto/manual).

import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGE_LABELS, isStage, isAtOrAfter, stageLabel, type Stage } from "./stages";

export type TransitionResult = {
  ok: boolean;
  changed: boolean;
  fromStage?: string;
  toStage?: Stage;
  finalStage?: string;
  error?: string;
};

export type TransitionOptions = {
  leadId: string;
  targetStage: Stage;
  reason?: string;
  auto: boolean;
  createdBy?: string | null;
  // Extra column writes applied alongside the stage change (e.g. order ids).
  // Persisted even on an idempotent no-op so route metadata is saved.
  extra?: Record<string, unknown>;
};

export async function applyStageTransition(
  // Accept any Supabase client (user-scoped server client or service client).
  supabase: SupabaseClient,
  opts: TransitionOptions
): Promise<TransitionResult> {
  const { leadId, targetStage, auto } = opts;

  if (!isStage(targetStage)) {
    return { ok: false, changed: false, error: `Invalid target stage: ${targetStage}` };
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, stage")
    .eq("id", leadId)
    .maybeSingle();

  if (error) return { ok: false, changed: false, error: error.message };
  if (!lead) return { ok: false, changed: false, error: "Lead not found" };

  const current = (lead as { stage: string }).stage;

  // Persist any extra column writes regardless of the stage decision.
  if (opts.extra && Object.keys(opts.extra).length > 0) {
    const { error: exErr } = await supabase
      .from("leads")
      .update(opts.extra)
      .eq("id", leadId);
    if (exErr) return { ok: false, changed: false, error: exErr.message };
  }

  // Already there → nothing to do.
  if (current === targetStage) {
    return { ok: true, changed: false, fromStage: current, toStage: targetStage, finalStage: current };
  }

  // Auto guard rails (kept for compatibility; manual UI moves pass auto:false
  // and may go anywhere — backward or to `lost`).
  if (auto) {
    if (current === "lost") {
      return { ok: true, changed: false, fromStage: current, toStage: targetStage, finalStage: current };
    }
    if (isAtOrAfter(current, targetStage)) {
      return { ok: true, changed: false, fromStage: current, toStage: targetStage, finalStage: current };
    }
  }

  // Apply the change.
  const { error: updErr } = await supabase
    .from("leads")
    .update({ stage: targetStage, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (updErr) return { ok: false, changed: false, error: updErr.message };

  // Log it. No auto-advance: the lead rests exactly on `targetStage`.
  const reasonText = opts.reason ? ` — ${opts.reason}` : "";
  await supabase.from("activities").insert({
    lead_id: leadId,
    type: "stage_change",
    content: `${stageLabel(current)} → ${STAGE_LABELS[targetStage]} (${auto ? "auto" : "manual"})${reasonText}`,
    created_by: opts.createdBy ?? null,
  });

  return { ok: true, changed: true, fromStage: current, toStage: targetStage, finalStage: targetStage };
}
