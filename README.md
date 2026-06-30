# GROW NEST — B2B Lead CRM

A multi-user B2B lead-tracking CRM. Owners log in and share one pipeline. Leads
arrive automatically from a Klaviyo signup form (webhook); pipeline stages are
moved **manually** (drag-drop a card or pick a stage). The app now ships a full
dashboard redesign plus manual **WhatsApp** outreach, **Shopify** customer/order
integration, and a safe **MCP server** for Claude.

Built with **Next.js 14 (App Router, TypeScript)**, **Tailwind CSS**,
**Supabase** (Postgres + Auth), and **@dnd-kit/core** for drag-and-drop.
Deploys on **Vercel**.

---

## Pipeline stages

8 ordered pipeline stages, plus a terminal off-pipeline `lost`:

1 `new_lead` · 2 `verification` · 3 `first_whatsapp_sent` · 4 `company_created` ·
5 `sample_selection` · 6 `sample_order_done` · 7 `feedback_pending` ·
8 `first_paid_order` — plus `lost`.

These values are the single source of truth in [`lib/stages.ts`](lib/stages.ts)
and are a hard contract: the DB, UI, transition engine, webhooks, and MCP server
all depend on them. Each pipeline stage has an order index and a distinct color;
`lost` is off-pipeline (order 0).

### Stage transitions (fully manual)

The pipeline is **fully manual**. Every stage change — drag-drop on the Kanban
or the stage dropdown in the lead drawer — flows through one function,
`applyStageTransition` in [`lib/stage-engine.ts`](lib/stage-engine.ts):

- **A stage only ever changes because a person did it.** There is **no
  auto-advance** of any kind — the lead rests exactly where you put it.
- Manual moves may go anywhere (forward, backward, or to `lost`).
- Idempotent: moving to the stage a lead is already on is a no-op.
- Every real change logs a `stage_change` activity (old → new).

UI changes call `POST /api/leads/transition` (logged-in users only). The Klaviyo
webhook simply creates new leads at `new_lead` — it no longer advances them.
There are **no Shopify-driven stage transitions** anymore (creating a Shopify
customer / sample order saves the relevant ids but does not move the stage; the
Shopify webhook endpoint verifies + acknowledges only).

### Undo a stage change

Marking a stage is one click/drag. **Undoing** is deliberately separate so it
can't happen by accident: the lead drawer has its own **"Undo a stage change"**
control (away from the stage dropdown) that is a 2-step action — pick which
logged change to undo, then confirm. Undo reverts the lead to the stage it was
in *before* that change (via `POST /api/leads/undo`) and logs a `stage_undo`
activity. See [`components/UndoControl.tsx`](components/UndoControl.tsx).

---

## Screens

A persistent sidebar + header shell wraps every authenticated view:

- **Dashboard** (`/`) — KPIs, pipeline funnel, follow-ups due, recent activity,
  leads-this-week, and conversion rate, all derived from live data.
- **Leads** (`/leads`) — filterable/searchable table (stage, quality, city).
  The header search routes here via `?q=`.
- **Pipeline** (`/pipeline`) — the kanban board. Drag a card to another column
  to update the stage **and** auto-log a `stage_change` activity.
- **Samples** (`/samples`) — sample-stage leads with an order→shipped→delivered→
  feedback tracker.
- **Follow-ups** (`/followups`) — overdue / due-today / upcoming groups.
- **Feedback** (`/feedback`) — leads with a captured rating/comment.
- **Reports** (`/reports`) — funnel, stage distribution, top categories, owner
  performance.
- **Settings** (`/settings`) — workspace, notification toggles, integration
  status, and the 8 pipeline stages.
- **Lead drawer** (click any lead) — tabbed **Details / Activity timeline**.
  Edit all fields, set any of the 8 stages by hand (dropdown), **Undo a stage
  change** (a deliberate 2-step control), and the **Shopify** create-customer /
  sample-order / sync-orders actions. (The **Send WhatsApp** button is hidden by
  default — see §3 to re-enable.)
- **Login** (`/login`) and **Add lead** (`/leads/new`).
- **Klaviyo webhook** (`POST /api/klaviyo-webhook`) — unchanged, secret-protected.

---

## 1. Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

### Environment variables (`.env.local` and Vercel)

| Variable | Where to find it / notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secret!) |
| `KLAVIYO_WEBHOOK_SECRET` | Any random string you choose (20+ chars) |
| `WHATSAPP_API_BASE_URL` | wasify origin (e.g. `https://wasify-one.vercel.app`) |
| `WHATSAPP_API_TOKEN` | wasify's `WACRM_API_TOKEN` bearer (secret!) |
| `WHATSAPP_SENDER` | Optional; unused by wasify (it resolves its own sender) |
| `SHOPIFY_STORE_DOMAIN` | e.g. `my-store.myshopify.com` |
| `SHOPIFY_ADMIN_API_TOKEN` | Custom-app Admin API token (secret!) |
| `SHOPIFY_API_VERSION` | e.g. `2024-10` (defaults to `2024-10`) |
| `SHOPIFY_WEBHOOK_SECRET` | HMAC secret Shopify signs webhooks with (secret!) |
| `SHOPIFY_WEBHOOK_CALLBACK_URL` | Webhook endpoint for the registration script (defaults to the prod URL) |
| `MCP_API_KEY` | Shared secret to use the MCP server (secret!) |

> Secret keys are used **only** server-side. Never expose them to the browser.
> WhatsApp and Shopify are optional: if their vars are unset, the UI shows a
> graceful "not configured" message instead of failing.

---

## 2. Supabase setup

1. Create a Supabase project.
2. Open the **SQL Editor**. Fresh setup: run [`supabase/schema.sql`](supabase/schema.sql).
   Existing DB: run the idempotent migrations **in order** —
   [`0001_design_shopify_whatsapp.sql`](supabase/migrations/0001_design_shopify_whatsapp.sql)
   (design + Shopify columns), then
   [`0002_sixteen_stages.sql`](supabase/migrations/0002_sixteen_stages.sql)
   (adds `sample_shopify_order_id` / `converted_order_id`), then
   [`0003_eight_stages.sql`](supabase/migrations/0003_eight_stages.sql)
   (**simplifies the pipeline to the current 8 stages** + `lost`, remapping every
   existing lead). All are idempotent / safe to re-run.
3. Invite owners: **Authentication → Users → Add user**. Email/password sign-in
   must be enabled under **Authentication → Providers → Email**.

---

## 3. WhatsApp (manual send)

> **The Send WhatsApp button is hidden in the UI by default.** All the code stays
> wired (`lib/whatsapp.ts`, `/api/whatsapp/send`, the wasify adapter, the env
> vars) — only the entry point is hidden. **To turn it back on, set
> `WHATSAPP_UI_ENABLED = true` at the top of
> [`components/LeadDrawer.tsx`](components/LeadDrawer.tsx)** (one line) and
> redeploy. That re-shows the drawer's **Send WhatsApp** button + composer and the
> footer **Message lead** button.

The drawer's **Send WhatsApp** composer offers 3 editable templates and posts to
`POST /api/whatsapp/send` (logged-in users only — the token never reaches the
browser). The recipient is the lead's `whatsapp` (falling back to `phone`),
normalized to E.164. Every send is logged to `activities` as a `whatsapp` row
with the message + delivery status.

The send adapter lives in [`lib/whatsapp.ts`](lib/whatsapp.ts) and routes
**through the wasify app** so every conversation is logged in wasify's inbox.
It POSTs `{ to, message }` to `{WHATSAPP_API_BASE_URL}/api/outbound/send` with an
`Authorization: Bearer {WHATSAPP_API_TOKEN}` header (wasify's machine-callable
outbound endpoint). The Meta access token stays inside wasify and never reaches
this app.

---

## 4. Shopify (customers, sample orders, webhooks)

Server routes (logged-in only), using the Shopify Admin **GraphQL** API. These
are optional helpers — the pipeline is **fully manual**, so **none of them move a
lead's stage** (mark stages by hand in the drawer):

- `POST /api/shopify/create-customer` — create-or-find a customer and save
  `shopify_customer_id`.
- `POST /api/shopify/create-sample-order` — create a Shopify sample order (draft
  order) and save its id to `sample_shopify_order_id`.
- `POST /api/shopify/sync-orders` — read the customer's orders and store
  `last_order_total` / `last_order_at` (reports paid count; mark **First Paid
  Order** by hand).

### Webhooks (receive-only)

`POST /api/shopify/webhooks` verifies the Shopify **HMAC** (raw body, header
`X-Shopify-Hmac-Sha256`, secret `SHOPIFY_WEBHOOK_SECRET`) and always returns 200
on a valid request. Because the pipeline is manual, it **does not move any
stage** — it just acknowledges. (When `SHOPIFY_WEBHOOK_SECRET` is unset it
no-ops gracefully.)

**Register the webhooks** (set the Shopify env vars first):

```bash
npx tsx scripts/register-shopify-webhooks.ts
```

This subscribes `ORDERS_FULFILLED` and `ORDERS_PAID` to
`SHOPIFY_WEBHOOK_CALLBACK_URL`. **Manual fallback:** Shopify admin → Settings →
Notifications → Webhooks → create one for *Order fulfillment* and one for
*Order payment*, both pointing at `/api/shopify/webhooks` (JSON). Then copy the
signing secret into `SHOPIFY_WEBHOOK_SECRET`.

### Custom-app Admin API scopes

- `read_customers`, `write_customers` — create/find customers
- `read_orders` — read orders (sync + order-paid webhook)
- `read_fulfillments` — recommended for the fulfillment webhook (order/fulfillment data)
- `write_draft_orders` — required for the sample-order (draft order) action

`read_orders` covers reading order/payment data; the **fulfillment** webhook is
most reliable with `read_fulfillments` also enabled.

---

## 5. MCP server (read + guarded write)

A self-contained TypeScript MCP server lives in [`mcp/`](mcp/) and exposes the
CRM to Claude over stdio. **Read** tools: `list_leads`, `get_lead`,
`list_activities`. **Write** tools (guarded; each also logs an activity):
`create_lead`, `update_lead_stage`, `add_activity`, `set_followup`. Writes never
delete data and stage values are validated against the 8 stages (+ `lost`).
Every tool requires the `MCP_API_KEY`. See [`mcp/README.md`](mcp/README.md) for build/run
and Claude config. It has its **own** `package.json` and is excluded from the
Next.js build.

---

## 6. Deploy to Vercel

1. Push to GitHub (pushing to `main` auto-deploys).
2. Add the environment variables above under **Project → Settings → Environment
   Variables** (only the ones you use — Supabase + Klaviyo are required;
   WhatsApp/Shopify/MCP are optional).
3. Deploy, then submit your Klaviyo form → a card appears in **New Lead**.

---

## Project structure

```
app/
  layout.tsx                       root layout (fonts)
  page.tsx  leads/  pipeline/  samples/  followups/  feedback/  reports/  settings/
  login/  leads/new/               auth + manual add
  auth/signout/route.ts
  api/klaviyo-webhook/route.ts     secret-protected webhook (unchanged)
  api/whatsapp/send/route.ts       manual WhatsApp send
  api/shopify/create-customer/route.ts  api/shopify/sync-orders/route.ts
components/
  shell/AppShell.tsx  shell/icons.tsx
  views/*View.tsx  views/useLeads.ts
  LeadDrawer.tsx  LeadCard.tsx  KanbanColumn.tsx  ActivityTimeline.tsx  AddLeadForm.tsx
lib/
  stages.ts  types.ts  design.ts  pageData.ts
  whatsapp.ts  shopify.ts
  supabase/client.ts  supabase/server.ts
middleware.ts                      session refresh + route protection
supabase/schema.sql                database + RLS
supabase/migrations/               standalone, idempotent migrations
mcp/                               self-contained MCP server
```
