// Single source of truth for pipeline stages.
// These exact string values are used everywhere (DB, UI, webhook).
// NOTE: these 8 values are a hard contract — never change or reorder them.

export const STAGES = [
  "new_lead",
  "contacted",
  "account_created",
  "sample_ordered",
  "sample_shipped",
  "feedback",
  "won",
  "lost",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  account_created: "Account Created",
  sample_ordered: "Sample Ordered",
  sample_shipped: "Sample Shipped",
  feedback: "Feedback",
  won: "Won",
  lost: "Lost",
};

// Visual treatment per stage, lifted from the design handoff palette.
// dot = accent dot, text = label color, bg = chip/pill background.
export type StageMeta = { dot: string; text: string; bg: string };

export const STAGE_META: Record<Stage, StageMeta> = {
  new_lead: { dot: "#8AA07E", text: "#5C6B50", bg: "#EDF1E9" },
  contacted: { dot: "#4F7390", text: "#3E5C73", bg: "#E9EFF3" },
  account_created: { dot: "#6C53C7", text: "#574099", bg: "#ECE9F7" },
  sample_ordered: { dot: "#2E8E8E", text: "#236E6E", bg: "#E2F0F0" },
  sample_shipped: { dot: "#C77F1A", text: "#94600F", bg: "#F9EFDD" },
  feedback: { dot: "#B5790A", text: "#875A06", bg: "#FAF0D8" },
  won: { dot: "#0E7B57", text: "#0A5A40", bg: "#E2F1EA" },
  lost: { dot: "#9AA0A6", text: "#6E747A", bg: "#EFEFED" },
};

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export function stageLabel(value: string): string {
  return isStage(value) ? STAGE_LABELS[value] : value;
}

export function stageMeta(value: string): StageMeta {
  return isStage(value) ? STAGE_META[value] : { dot: "#9AA0A6", text: "#6E747A", bg: "#EFEFED" };
}

// Ordered index for "stage N of 8" progress treatment in the drawer.
export function stageIndex(value: string): number {
  return isStage(value) ? STAGES.indexOf(value) : 0;
}
