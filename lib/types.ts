import type { Stage } from "./stages";

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
};

export type ActivityType =
  | "note"
  | "stage_change"
  | "sample_sent"
  | "feedback"
  | "email"
  | "call";

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
  >
>;
