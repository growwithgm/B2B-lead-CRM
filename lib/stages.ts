// Single source of truth for pipeline stages.
// These exact string values are used everywhere (DB, UI, webhook, engine, MCP).
// NOTE: the 16 pipeline values + `lost` are a hard contract — never rename or
// reorder them without a matching DB migration.

// The 16 ordered pipeline stages, in progression order.
export const PIPELINE_STAGES = [
  "new_lead",
  "contact_pending",
  "contacted",
  "info_required",
  "qualified",
  "shopify_company_pending",
  "shopify_company_created",
  "product_selection_pending",
  "sample_order_created",
  "sample_shipped",
  "sample_delivered",
  "feedback_pending",
  "feedback_received",
  "b2b_offer_sent",
  "first_order_pending",
  "converted",
] as const;

// `lost` is a terminal, off-pipeline MANUAL stage. Kept separate from the
// ordered pipeline but still a valid stage for storage/columns/filters.
export const STAGES = [...PIPELINE_STAGES, "lost"] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  new_lead: "New Lead",
  contact_pending: "Contact Pending",
  contacted: "Contacted",
  info_required: "Info Required",
  qualified: "Qualified",
  shopify_company_pending: "Shopify Company Pending",
  shopify_company_created: "Shopify Company Created",
  product_selection_pending: "Product Selection Pending",
  sample_order_created: "Sample Order Created",
  sample_shipped: "Sample Shipped",
  sample_delivered: "Sample Delivered",
  feedback_pending: "Feedback Pending",
  feedback_received: "Feedback Received",
  b2b_offer_sent: "B2B Offer Sent",
  first_order_pending: "First Order Pending",
  converted: "Converted",
  lost: "Lost",
};

// 1-based order index for forward/backward comparison. `lost` is off-pipeline (0).
export const STAGE_ORDER: Record<Stage, number> = {
  new_lead: 1,
  contact_pending: 2,
  contacted: 3,
  info_required: 4,
  qualified: 5,
  shopify_company_pending: 6,
  shopify_company_created: 7,
  product_selection_pending: 8,
  sample_order_created: 9,
  sample_shipped: 10,
  sample_delivered: 11,
  feedback_pending: 12,
  feedback_received: 13,
  b2b_offer_sent: 14,
  first_order_pending: 15,
  converted: 16,
  lost: 0,
};

// Visual treatment per stage (design handoff palette, grouped by family).
export type StageMeta = { dot: string; text: string; bg: string };

export const STAGE_META: Record<Stage, StageMeta> = {
  new_lead: { dot: "#8AA07E", text: "#5C6B50", bg: "#EDF1E9" },
  contact_pending: { dot: "#94A187", text: "#5C6B50", bg: "#EEF2EA" },
  contacted: { dot: "#4F7390", text: "#3E5C73", bg: "#E9EFF3" },
  info_required: { dot: "#6E8CA6", text: "#3E5C73", bg: "#EDF2F6" },
  qualified: { dot: "#2E8E8E", text: "#236E6E", bg: "#E2F0F0" },
  shopify_company_pending: { dot: "#8470C7", text: "#574099", bg: "#EFECF9" },
  shopify_company_created: { dot: "#6C53C7", text: "#574099", bg: "#ECE9F7" },
  product_selection_pending: { dot: "#9A7BD0", text: "#574099", bg: "#F0EAFA" },
  sample_order_created: { dot: "#C77F1A", text: "#94600F", bg: "#F9EFDD" },
  sample_shipped: { dot: "#C77F1A", text: "#94600F", bg: "#F9EFDD" },
  sample_delivered: { dot: "#B5790A", text: "#875A06", bg: "#FAF0D8" },
  feedback_pending: { dot: "#B5790A", text: "#875A06", bg: "#FAF0D8" },
  feedback_received: { dot: "#A8841F", text: "#7A5E08", bg: "#FBF3DC" },
  b2b_offer_sent: { dot: "#1F7A9E", text: "#185E79", bg: "#E4F0F5" },
  first_order_pending: { dot: "#3F90B0", text: "#185E79", bg: "#E8F2F7" },
  converted: { dot: "#0E7B57", text: "#0A5A40", bg: "#E2F1EA" },
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

export function isConverted(value: string): boolean {
  return value === "converted";
}

export function isLost(value: string): boolean {
  return value === "lost";
}

// Terminal = no further follow-up expected (won or off-pipeline).
export function isTerminal(value: string): boolean {
  return value === "converted" || value === "lost";
}
