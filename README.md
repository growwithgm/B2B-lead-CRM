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

16 ordered pipeline stages, plus a terminal off-pipeline `lost`:

1 `new_lead` · 2 `contact_pending` · 3 `contacted` · 4 `info_required` ·
5 `qualified` · 6 `shopify_company_pending` · 7 `shopify_company_created` ·
8 `product_selection_pending` · 9 `sample_order_created` · 10 `sample_shipped` ·
11 `sample_delivered` · 12 `feedback_pending` · 13 `feedback_received` ·
14 `b2b_offer_sent` · 15 `first_order_pending` · 16 `converted` — plus `lost`.

These values are the single source of truth in [`lib/stages.ts`](lib/stages.ts)
and are a hard contract: the DB, UI, transition engine, webhooks, and MCP server
all depend on them. Each pipeline stage has an order index so transitions can
compare forward/backward; `lost` is off-pipeline (order 0).

### Stage transitions (auto / manual engine)

Every stage change — drag-drop, the stage dropdown, drawer buttons, Shopify
routes, and Shopify webhooks — flows through one function,
`applyStageTransition` in [`lib/stage-engine.ts`](lib/stage-engine.ts):

- **Forward-only for AUTO** moves; manual moves may go anywhere (incl. backward
  or to `lost`).
- **`lost` is never overridden automatically.**
- **Idempotent**: an auto move to a stage we're already at/after is a no-op
  (webhooks can fire twice).
- Every real change logs a `stage_change` activity (old → new, auto/manual).
- **Auto-advance** pairs run after any change:
  `new_lead → contact_pending`, `qualified → shopify_company_pending`,
  `shopify_company_created → product_selection_pending`,
  `sample_delivered → feedback_pending`.

**Manual** stages (set by a person): `contacted`, `info_required`, `qualified`,
`sample_delivered`, `feedback_received`, `b2b_offer_sent`, `first_order_pending`,
`lost`. **Action/webhook-driven AUTO** stages: `shopify_company_created` (create
customer), `sample_order_created` (create sample order), `sample_shipped`
(fulfillment webhook), `converted` (order-paid webhook), plus the auto-advance
pending stages above. UI changes call `POST /api/leads/transition`; the Klaviyo
webhook auto-advances new leads to `contact_pending`.

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
  Edit all fields, change stage, the two quick buttons (**Mark Sample Sent** →
  Sample Shipped, **Mark Feedback Received** → Feedback), **Send WhatsApp**, and
  the **Shopify** create-customer / sync-orders actions.
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
| `WHATSAPP_API_BASE_URL` | Your WhatsApp app's send endpoint |
| `WHATSAPP_API_TOKEN` | Bearer token for that API (secret!) |
| `WHATSAPP_SENDER` | Your sender id / from number |
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
   (remaps the old 8 stages to the new 16 and adds `sample_shopify_order_id` /
   `converted_order_id`). All are safe to re-run.
3. Invite owners: **Authentication → Users → Add user**. Email/password sign-in
   must be enabled under **Authentication → Providers → Email**.

---

## 3. WhatsApp (manual send)

The drawer's **Send WhatsApp** composer offers 3 editable templates and posts to
`POST /api/whatsapp/send` (logged-in users only — the token never reaches the
browser). The recipient is the lead's `whatsapp` (falling back to `phone`),
normalized to E.164. Every send is logged to `activities` as a `whatsapp` row
with the message + delivery status.

The send adapter lives in [`lib/whatsapp.ts`](lib/whatsapp.ts) and is
**env-configurable**. By default it POSTs JSON
`{ from, to, type: "text", text: { body } }` with an `Authorization: Bearer`
header. If your provider's request/response shape differs, adjust the clearly
commented block in that file — no other code changes needed.

---

## 4. Shopify (customers, sample orders, webhooks)

Server routes (logged-in only), using the Shopify Admin **GraphQL** API. Each
also drives the pipeline through the transition engine:

- `POST /api/shopify/create-customer` — create-or-find a customer, save
  `shopify_customer_id`, then AUTO → `shopify_company_created` (engine
  auto-advances to `product_selection_pending`).
- `POST /api/shopify/create-sample-order` — create a Shopify sample order (draft
  order), save its id to `sample_shopify_order_id`, then AUTO →
  `sample_order_created`.
- `POST /api/shopify/sync-orders` — read the customer's orders, store
  `last_order_total` / `last_order_at`; if ≥1 paid order, offer to mark the lead
  **converted**.

### Webhooks (full auto)

`POST /api/shopify/webhooks` verifies the Shopify **HMAC** (raw body, header
`X-Shopify-Hmac-Sha256`, secret `SHOPIFY_WEBHOOK_SECRET`) and dispatches by the
`X-Shopify-Topic` header. It always returns 200 on a valid request and is
idempotent + forward-only via the engine:

- **`orders/fulfilled`** → the lead whose `sample_shopify_order_id` matches the
  order → `sample_shipped`.
- **`orders/paid`** → lead by `shopify_customer_id`; if the paid order is **not**
  the sample order → `converted` (saves `converted_order_id`, `last_order_total`,
  `last_order_at`). If it *is* the sample order, it's ignored.

> The webhook path is excluded from auth middleware (like the Klaviyo webhook).
> Order-id matching is tolerant (GID / numeric id / name). If you use the draft
> sample-order flow, set the lead's `sample_shopify_order_id` to the real
> fulfilled order's id (or extend the flow to complete the draft) so fulfillment
> matching lands.

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
delete data and stage values are validated against the 16 stages (+ `lost`).
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
