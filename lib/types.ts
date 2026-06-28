import type { Stage } from "./stages";

export type LeadQuality = "hot" | "warm" | "cold";

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  company_name: string | null;
  vat_number: string | null;
  ship_line1: string | null;
  ship_city: string | null;
  ship_postcode: string | null;
  ship_country: string | null;
  brand: string | null;
  requested_products: string | null;
  source: string | null;
  stage: Stage;
  next_followup: string | null;
  assigned_to: string | null;

  // --- Design-backing columns (added to match the dashboard handoff) ---
  lead_score: number | null;
  lead_quality: LeadQuality | null;
  business_type: string | null;
  language: string | null;
  owner_name: string | null;
  est_monthly_value: number | null;
  website: string | null;
  instagram: string | null;
  categories: string[] | null;
  klaviyo_profile_id: string | null;
  real_business: boolean | null;
  has_shop: boolean | null;
  next_action: string | null;
  last_contact_at: string | null;

  // Sample tracking (Samples view + drawer)
  sample_order_number: string | null;
  sample_status: string | null;
  sample_carrier: string | null;
  sample_tracking: string | null;
  sample_shipped_at: string | null;
  feedback_due: string | null;

  // Lightweight feedback capture (Feedback view + drawer)
  feedback_rating: number | null;
  feedback_comment: string | null;
  feedback_favorite: string | null;
  feedback_interest: string | null;

  // --- Shopify integration (Phase 3) ---
  shopify_customer_id: string | null;
  shopify_company_id: string | null;
  last_order_total: number | null;
  last_order_at: string | null;
};

export type ActivityType =
  | "note"
  | "stage_change"
  | "sample_sent"
  | "feedback"
  | "email"
  | "call"
  | "whatsapp"
  | "shopify";

export type Activity = {
  id: string;
  lead_id: string;
  type: ActivityType;
  content: string | null;
  created_by: string | null;
  created_at: string;
};

// Fields a user may edit from the lead drawer / add-lead form.
export type LeadEditableFields = Partial<
  Pick<
    Lead,
    | "contact_name"
    | "email"
    | "phone"
    | "whatsapp"
    | "company_name"
    | "vat_number"
    | "ship_line1"
    | "ship_city"
    | "ship_postcode"
    | "ship_country"
    | "brand"
    | "requested_products"
    | "next_followup"
    | "stage"
    | "lead_score"
    | "lead_quality"
    | "business_type"
    | "language"
    | "owner_name"
    | "est_monthly_value"
    | "website"
    | "instagram"
    | "next_action"
  >
>;
