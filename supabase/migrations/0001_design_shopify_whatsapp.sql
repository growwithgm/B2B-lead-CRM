-- ============================================================
-- Migration 0001 — dashboard redesign + Shopify/WhatsApp support
-- Idempotent: safe to run multiple times. Run in the Supabase SQL Editor.
--
-- Adds the columns the redesigned UI reads/writes. Nothing here changes the
-- 8 pipeline stage values, the Klaviyo webhook, auth, or RLS. Every column is
-- nullable or defaulted so existing rows and the webhook keep working.
-- ============================================================

-- Design-backing columns -------------------------------------------------
alter table leads add column if not exists lead_score integer default 0;
alter table leads add column if not exists lead_quality text;          -- hot | warm | cold
alter table leads add column if not exists business_type text;
alter table leads add column if not exists language text;
alter table leads add column if not exists owner_name text;
alter table leads add column if not exists est_monthly_value numeric;
alter table leads add column if not exists website text;
alter table leads add column if not exists instagram text;
alter table leads add column if not exists categories text[];
alter table leads add column if not exists klaviyo_profile_id text;
alter table leads add column if not exists real_business boolean;
alter table leads add column if not exists has_shop boolean;
alter table leads add column if not exists next_action text;
alter table leads add column if not exists last_contact_at timestamptz;

-- Sample tracking --------------------------------------------------------
alter table leads add column if not exists sample_order_number text;
alter table leads add column if not exists sample_status text;
alter table leads add column if not exists sample_carrier text;
alter table leads add column if not exists sample_tracking text;
alter table leads add column if not exists sample_shipped_at timestamptz;
alter table leads add column if not exists feedback_due date;

-- Lightweight feedback capture ------------------------------------------
alter table leads add column if not exists feedback_rating integer;
alter table leads add column if not exists feedback_comment text;
alter table leads add column if not exists feedback_favorite text;
alter table leads add column if not exists feedback_interest text;       -- yes | maybe | no

-- Shopify integration (Phase 3) -----------------------------------------
alter table leads add column if not exists shopify_customer_id text;
alter table leads add column if not exists shopify_company_id text;
alter table leads add column if not exists last_order_total numeric;
alter table leads add column if not exists last_order_at timestamptz;
