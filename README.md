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

`new_lead` · `contacted` · `account_created` · `sample_ordered` ·
`sample_shipped` · `feedback` · `won` · `lost`

(Displayed as: New Lead, Contacted, Account Created, Sample Ordered,
Sample Shipped, Feedback, Won, Lost.) These 8 values are a hard contract — the
DB, UI, webhook, and MCP server all depend on them.

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
| `MCP_API_KEY` | Shared secret to use the MCP server (secret!) |

> Secret keys are used **only** server-side. Never expose them to the browser.
> WhatsApp and Shopify are optional: if their vars are unset, the UI shows a
> graceful "not configured" message instead of failing.

---

## 2. Supabase setup

1. Create a Supabase project.
2. Open the **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql)
   (fresh setup), **or** if you already have the original tables, run the
   idempotent migration
   [`supabase/migrations/0001_design_shopify_whatsapp.sql`](supabase/migrations/0001_design_shopify_whatsapp.sql)
   to add the new columns (design fields + Shopify columns). Both are safe to
   re-run.
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

## 4. Shopify (create customer + read orders)

Server routes (logged-in only), using the Shopify Admin **GraphQL** API:

- `POST /api/shopify/create-customer` — create-or-find a customer for the lead
  (email + name + phone, company stored as a note/tag) and save
  `shopify_customer_id` on the lead.
- `POST /api/shopify/sync-orders` — read the customer's orders, store
  `last_order_total` / `last_order_at`, and (if ≥1 paid order) offer to mark the
  lead **won**.

Both log a `shopify` activity. Create a **custom app** in your Shopify admin and
grant these Admin API scopes:

- `read_customers`
- `write_customers`
- `read_orders`

---

## 5. MCP server (read + guarded write)

A self-contained TypeScript MCP server lives in [`mcp/`](mcp/) and exposes the
CRM to Claude over stdio. **Read** tools: `list_leads`, `get_lead`,
`list_activities`. **Write** tools (guarded; each also logs an activity):
`create_lead`, `update_lead_stage`, `add_activity`, `set_followup`. Writes never
delete data and stage values are validated against the 8 stages. Every tool
requires the `MCP_API_KEY`. See [`mcp/README.md`](mcp/README.md) for build/run
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
