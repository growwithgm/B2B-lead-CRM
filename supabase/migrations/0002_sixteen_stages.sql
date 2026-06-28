-- ============================================================
-- Migration 0002 — 16-stage pipeline
-- Idempotent: safe to run multiple times. Run AFTER 0001.
--
-- Remaps the old 8 stage values to the new 16-stage vocabulary and adds the
-- two order-id columns the transition engine + Shopify webhooks need. Does not
-- touch RLS, the Klaviyo webhook, or any other column.
-- ============================================================

-- 1) Remap existing rows to the new stage values. Each statement is a no-op
--    on a second run (the old values no longer exist after the first pass).
update leads set stage = 'shopify_company_created' where stage = 'account_created';
update leads set stage = 'sample_order_created'    where stage = 'sample_ordered';
update leads set stage = 'feedback_received'       where stage = 'feedback';
update leads set stage = 'converted'               where stage = 'won';
-- new_lead, contacted, sample_shipped, lost keep their existing values.

-- 2) Columns the engine + webhooks rely on.
alter table leads add column if not exists sample_shopify_order_id text;
alter table leads add column if not exists converted_order_id text;

-- (shopify_customer_id, last_order_total, last_order_at were added in 0001.)
