// Single source of truth for pipeline stages.
// These exact string values are used everywhere (DB, UI, webhook, engine, MCP).
// NOTE: the 8 pipeline values + `lost` are a hard contract — never rename or
// reorder them without a matching DB migration (see supabase/migrations).

// The 8 ordered pipeline stages, in progression order.
export const PIPELINE_STAGES = [
  "new_lead",
  "verification",
  "first_whatsapp_sent",
  "company_created",
  "sample_selection",
  "sample_order_done",
  "feedback_pending",
  "first_paid_order",
] as const;

// `lost` is a terminal, off-pipeline MANUAL stage. Kept separate from the
// ordered pipeline but still a valid stage for storage/columns/filters.
export const STAGES = [...PIPELINE_STAGES, "lost"] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  new_lead: "New Lead",
  verification: "Verification",
  first_whatsapp_sent: "First WhatsApp Sent",
  company_created: "Company Account Created",
  sample_selection: "Sample Selection",
  sample_order_done: "Sample Order Done",
  feedback_pending: "Feedback Pending",
  first_paid_order: "First Paid Order",
  lost: "Lost",
};

// 1-based order index for forward/backward comparison. `lost` is off-pipeline (0).
export const STAGE_ORDER: Record<Stage, number> = {
  new_lead: 1,
  verification: 2,
  first_whatsapp_sent: 3,
  company_created: 4,
  sample_selection: 5,
  sample_order_done: 6,
  feedback_pending: 7,
  first_paid_order: 8,
  lost: 0,
};

// Visual treatment per stage (design handoff palette — each stage a distinct color).
export type StageMeta = { dot: string; text: string; bg: string };

export const STAGE_META: Record<Stage, StageMeta> = {
  new_lead: { dot: "#8AA07E", text: "#5C6B50", bg: "#EDF1E9" },
  verification: { dot: "#4F7390", text: "#3E5C73", bg: "#E9EFF3" },
  first_whatsapp_sent: { dot: "#1F8A5B", text: "#15623F", bg: "#E3F3EA" },
  company_created: { dot: "#6C53C7", text: "#574099", bg: "#ECE9F7" },
  sample_selection: { dot: "#9A7BD0", text: "#6E50A8", bg: "#F0EAFA" },
  sample_order_done: { dot: "#C77F1A", text: "#94600F", bg: "#F9EFDD" },
  feedback_pending: { dot: "#B5790A", text: "#875A06", bg: "#FAF0D8" },
  first_paid_order: { dot: "#0E7B57", text: "#0A5A40", bg: "#E2F1EA" },
  lost: { dot: "#9AA0A6", text: "#6E747A", bg: "#EFEFED" },
};

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export function isPipelineStage(value: string): value is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(value);
}

export function stageLabel(value: string): string {
  return isStage(value) ? STAGE_LABELS[value] : value;
}

export function stageMeta(value: string): StageMeta {
  return isStage(value)
    ? STAGE_META[value]
    : { dot: "#9AA0A6", text: "#6E747A", bg: "#EFEFED" };
}

// Reverse map: human label → stage value. Used by the Undo control to recover
// the "before" stage from a logged `stage_change` activity ("From → To …").
export const STAGE_BY_LABEL: Record<string, Stage> = Object.fromEntries(
  (Object.entries(STAGE_LABELS) as [Stage, string][]).map(([value, label]) => [
    label,
    value,
  ])
) as Record<string, Stage>;

// 1-based order (0 = lost / off-pipeline / unknown).
export function stageOrder(value: string): number {
  return isStage(value) ? STAGE_ORDER[value] : 0;
}

// 0-based pipeline index for progress display (-1 for lost / unknown).
export function stageIndex(value: string): number {
  return isPipelineStage(value) ? PIPELINE_STAGES.indexOf(value) : -1;
}

// True when `a` is the same as, or further along the pipeline than, `b`.
// `lost` is off-pipeline: it is only "at/after" itself.
export function isAtOrAfter(a: string, b: Stage): boolean {
  if (a === "lost" || b === "lost") return a === b;
  return stageOrder(a) >= stageOrder(b);
}

// "Won" = the lead placed its first paid order.
export function isConverted(value: string): boolean {
  return value === "first_paid_order";
}

export function isLost(value: string): boolean {
  return value === "lost";
}

// Terminal = no further follow-up expected (won or off-pipeline).
export function isTerminal(value: string): boolean {
  return value === "first_paid_order" || value === "lost";
}
