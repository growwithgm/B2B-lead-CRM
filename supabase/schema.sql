-- ============================================================
-- GROW NEST B2B Lead CRM — Supabase schema
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- LEADS
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  contact_name text,
  email text not null,
  phone text,
  whatsapp text,
  company_name text,
  vat_number text,
  ship_line1 text,
  ship_city text,
  ship_postcode text,
  ship_country text default 'ES',
  brand text,
  requested_products text,
  source text default 'klaviyo',
  stage text not null default 'new_lead',         -- see stage list below
  next_followup date,
  assigned_to uuid references auth.users,

  -- Design-backing columns (dashboard redesign). All optional/defaulted so the
  -- Klaviyo webhook and existing inserts keep working unchanged.
  lead_score integer default 0,
  lead_quality text,                              -- hot | warm | cold
  business_type text,
  language text,
  owner_name text,
  est_monthly_value numeric,
  website text,
  instagram text,
  categories text[],
  klaviyo_profile_id text,
  real_business boolean,
  has_shop boolean,
  next_action text,
  last_contact_at timestamptz,

  -- Sample tracking (Samples view + lead drawer)
  sample_order_number text,
  sample_status text,
  sample_carrier text,
  sample_tracking text,
  sample_shipped_at timestamptz,
  feedback_due date,

  -- Lightweight feedback capture (Feedback view + lead drawer)
  feedback_rating integer,
  feedback_comment text,
  feedback_favorite text,
  feedback_interest text,                         -- yes | maybe | no

  -- Shopify integration (Phase 3)
  shopify_customer_id text,
  shopify_company_id text,
  last_order_total numeric,
  last_order_at timestamptz
);

-- ACTIVITY TIMELINE
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  type text default 'note',                       -- note | stage_change | sample_sent | feedback | email | call | whatsapp | shopify
  content text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

alter table leads enable row level security;
alter table activities enable row level security;

-- both authenticated users see and edit everything (shared pipeline)
create policy "authed full access leads" on leads for all to authenticated using (true) with check (true);
create policy "authed full access activities" on activities for all to authenticated using (true) with check (true);

-- ============================================================
-- OPTIONAL (recommended) — performance + data integrity.
-- Safe to run; nothing in the app depends on these existing.
-- ============================================================

-- Dedupe guard for the Klaviyo webhook (case-insensitive unique email).
create unique index if not exists leads_email_unique
  on leads (lower(email));

-- Faster board grouping / timeline ordering.
create index if not exists leads_stage_idx on leads (stage);
create index if not exists activities_lead_id_created_idx
  on activities (lead_id, created_at desc);

-- Keep updated_at fresh automatically on any row update.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at
  before update on leads
  for each row execute function set_updated_at();
