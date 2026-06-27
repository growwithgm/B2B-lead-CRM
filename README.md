# GROW NEST — B2B Lead CRM

A multi-user B2B lead-tracking CRM. Two brand owners log in and share one
pipeline. Leads arrive automatically from a Klaviyo signup form (webhook), and
pipeline stages are moved **manually** (drag-drop a card or pick a stage). No
Shopify / order integration — everything after lead capture is manual.

Built with **Next.js 14 (App Router, TypeScript)**, **Tailwind CSS**,
**Supabase** (Postgres + Auth), and **@dnd-kit/core** for drag-and-drop.
Deploys on **Vercel**.

---

## Pipeline stages

`new_lead` · `contacted` · `account_created` · `sample_ordered` ·
`sample_shipped` · `feedback` · `won` · `lost`

(Displayed as: New Lead, Contacted, Account Created, Sample Ordered,
Sample Shipped, Feedback, Won, Lost.)

---

## Features

- **Login** (`/login`) — Supabase email/password. All CRM routes are protected
  by middleware; unauthenticated users are redirected to `/login`.
- **Kanban board** (`/`) — one column per stage. Cards show company (or contact),
  truncated requested products, and the next follow-up date (red if overdue).
  Drag a card to another column to update the stage **and** auto-log a
  `stage_change` activity.
- **Lead drawer** (click a card) — edit all contact/company/shipping fields,
  set the stage from a dropdown, pick a follow-up date, read the activity
  timeline (newest first), add notes, and two quick buttons:
  **Mark Sample Sent** (→ Sample Shipped) and **Mark Feedback Received**
  (→ Feedback).
- **Add lead** (`/leads/new`) — manual entry for leads not from Klaviyo.
- **Stats bar** — total leads, count per stage, and overdue follow-ups.
- **Klaviyo webhook** (`POST /api/klaviyo-webhook`) — the only secret-protected
  server route. Verifies the secret, maps fields tolerantly, dedupes on email,
  and inserts a `new_lead`.

---

## 1. Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

### Environment variables (`.env.local`)

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (keep secret!) |
| `KLAVIYO_WEBHOOK_SECRET` | Any random string you choose (20+ chars) |

> The service-role key bypasses RLS and is used **only** server-side in the
> webhook. Never expose it to the browser.

---

## 2. Supabase setup

1. Create a Supabase project.
2. Open the **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. Invite both owners: **Authentication → Users → Add user** (set a password,
   or send an invite). Email/password sign-in must be enabled under
   **Authentication → Providers → Email**.

---

## 3. Klaviyo webhook

In your lead-capture Flow, add a **Webhook** action:

- **URL:** `https://YOUR-APP.vercel.app/api/klaviyo-webhook`
- **Auth:** send the secret as either
  - header `x-webhook-secret: <KLAVIYO_WEBHOOK_SECRET>`, or
  - query string `?secret=<KLAVIYO_WEBHOOK_SECRET>`
- **Body:** JSON containing at least `email`, plus any of `name`, `phone`,
  `company`, `address`, `city`, `postcode`, `country`, `requested_products`, etc.

Field mapping is intentionally tolerant and the raw body is logged
(`[klaviyo-webhook] raw body: …` in Vercel logs) so you can adjust the mapping
in `app/api/klaviyo-webhook/route.ts` to match your exact Klaviyo payload.

---

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add the four environment variables (same as `.env.local`) under
   **Project → Settings → Environment Variables**.
4. Deploy.
5. **Test:** submit your Klaviyo form → a card should appear in **New Lead**.
   Then drag it through the stages manually.

---

## Project structure

```
app/
  layout.tsx                 root layout
  page.tsx                   Kanban board (protected)
  login/page.tsx             email/password login
  leads/new/page.tsx         manual add-lead
  auth/signout/route.ts      sign-out handler
  api/klaviyo-webhook/route.ts   the single secret-protected webhook
components/
  KanbanBoard.tsx  KanbanColumn.tsx  LeadCard.tsx
  LeadDrawer.tsx   ActivityTimeline.tsx  AddLeadForm.tsx  StatsBar.tsx
lib/
  stages.ts  types.ts
  supabase/client.ts  supabase/server.ts
middleware.ts                session refresh + route protection
supabase/schema.sql          database + RLS
```

---

## Phase 2 ideas

- Follow-up reminders (WhatsApp / WATI) when `next_followup` is due.
- Auto-send a feedback-form link when a lead reaches `sample_shipped`.
- Simple conversion report for `won` leads.
