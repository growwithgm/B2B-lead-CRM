// Single source of truth for pipeline stages.
// These exact string values are used everywhere (DB, UI, webhook).

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

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export function stageLabel(value: string): string {
  return isStage(value) ? STAGE_LABELS[value] : value;
}
