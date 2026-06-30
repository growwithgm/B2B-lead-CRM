// Stage transition engine — the single chokepoint every stage change flows
// through (drag-drop, the stage dropdown, drawer buttons, Shopify routes, and
// Shopify webhooks). Centralizes the auto/manual rules so they can't drift.
//
// Rules:
//  - Forward-only for AUTO transitions: an auto move never goes to an earlier
//    stage. Manual moves may go anywhere (including backward or to `lost`).
//  - `lost` is never overridden automatically.
//  - Idempotent: an auto move to a stage we're already at/after is a no-op
//    (webhooks can fire more than once).
//  - Every real change logs a `stage_change` activity (old → new, auto/manual).
//  - After a successful AUTO change, "pending" stages auto-advance one step.
//    Manual moves do NOT auto-advance, so a person can rest a lead on any of
//    the 16 stages by hand (drag-drop / stage dropdown).

import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGE_LABELS, isStage, isAtOrAfter, stageLabel, type Stage } from "./stages";

// "Set X → system immediately advances to its pending stage."
const AUTO_ADVANCE: Partial<Record<Stage, Stage>> = {
  new_lead: "contact_pending",
  qualified: "shopify_company_pending",
  shopify_company_created: "product_selection_pending",
  sample_delivered: "feedback_pending",
};

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
  // Persisted even on an idempotent no-op so webhook/route metadata is saved.
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

  // Auto guard rails.
  if (auto) {
    if (current === "lost") {
      return { ok: true, changed: false, fromStage: current, toStage: targetStage, finalStage: current };
    }
    if (isAtOrAfter(current, targetStage)) {
      // Forward-only + idempotent.
      return { ok: true, changed: false, fromStage: current, toStage: targetStage, finalStage: current };
    }
  }

  // Apply the change.
  const { error: updErr } = await supabase
    .from("leads")
    .update({ stage: targetStage, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (updErr) return { ok: false, changed: false, error: updErr.message };

  // Log it.
  const reasonText = opts.reason ? ` — ${opts.reason}` : "";
  await supabase.from("activities").insert({
    lead_id: leadId,
    type: "stage_change",
    content: `${stageLabel(current)} → ${STAGE_LABELS[targetStage]} (${auto ? "auto" : "manual"})${reasonText}`,
    created_by: opts.createdBy ?? null,
  });

  // Auto-advance pending stages — ONLY for AUTO transitions (Klaviyo intake,
  // Shopify webhooks/actions). Manual UI moves (auto:false) intentionally do not
  // auto-advance, so a person can land and rest a lead on ANY stage by hand
  // (including the otherwise Shopify-automatic ones). The advance is itself an
  // AUTO transition: forward-only, never overrides lost, and cannot loop (no
  // target is also a key after the first hop).
  let finalStage: string = targetStage;
  if (auto) {
    const next = AUTO_ADVANCE[targetStage];
    if (next) {
      const adv = await applyStageTransition(supabase, {
        leadId,
        targetStage: next,
        reason: "auto-advance",
        auto: true,
        createdBy: opts.createdBy ?? null,
      });
      if (adv.ok && adv.finalStage) finalStage = adv.finalStage;
    }
  }

  return { ok: true, changed: true, fromStage: current, toStage: targetStage, finalStage };
}
