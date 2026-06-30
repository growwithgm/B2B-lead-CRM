-- ============================================================
-- 0003_eight_stages.sql
-- Simplify the pipeline from 16 stages to 8 (+ 'lost').
--
-- Remaps every existing lead from the old 16-stage values to the new 8.
-- Idempotent: re-running is a no-op (old values are already gone, and every
-- row is already one of the canonical values). Never drops a row.
--
-- New canonical stages (see lib/stages.ts):
--   new_lead, verification, first_whatsapp_sent, company_created,
--   sample_selection, sample_order_done, feedback_pending, first_paid_order
--   + lost
-- ============================================================

-- new_lead → new_lead (unchanged)

-- contact_pending, contacted, info_required, qualified → verification
update leads set stage = 'verification'
 where stage in ('contact_pending', 'contacted', 'info_required', 'qualified');

-- shopify_company_pending, shopify_company_created, product_selection_pending → company_created
update leads set stage = 'company_created'
 where stage in ('shopify_company_pending', 'shopify_company_created', 'product_selection_pending');

-- sample_order_created, sample_shipped, sample_delivered → sample_order_done
update leads set stage = 'sample_order_done'
 where stage in ('sample_order_created', 'sample_shipped', 'sample_delivered');

-- feedback_pending → feedback_pending (unchanged)
-- feedback_received, b2b_offer_sent, first_order_pending → feedback_pending
update leads set stage = 'feedback_pending'
 where stage in ('feedback_received', 'b2b_offer_sent', 'first_order_pending');

-- converted → first_paid_order
update leads set stage = 'first_paid_order'
 where stage = 'converted';

-- lost → lost (unchanged)

-- Safety net: never leave an invalid/unknown stage behind (never drop a row).
update leads set stage = 'new_lead'
 where stage not in (
   'new_lead', 'verification', 'first_whatsapp_sent', 'company_created',
   'sample_selection', 'sample_order_done', 'feedback_pending',
   'first_paid_order', 'lost'
 );

-- Keep the default for brand-new inserts aligned with the new model.
alter table leads alter column stage set default 'new_lead';
