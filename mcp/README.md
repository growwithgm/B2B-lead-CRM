# grow-nest-crm-mcp

A self-contained [Model Context Protocol](https://modelcontextprotocol.io) (MCP)
server that exposes read and write tools for the B2B Lead CRM, backed by Supabase
Postgres. It runs over the **stdio** transport and is completely independent of the
Next.js app — it has its own `package.json` and dependencies.

## Tools

### Read (read-only)
- `list_leads` — filters: `stage` (one of the 8 stages), `search` (matches
  contact_name / company_name / email, case-insensitive), `overdue` (boolean:
  `next_followup < today` and stage not in `first_paid_order`/`lost`). Returns up to 100 rows.
- `get_lead` — by `id`; returns the lead plus its 50 most recent activities.
- `list_activities` — by `lead_id`; most recent `limit` activities (default 50, max 200).

### Write (guarded; never delete; each records an activity)
- `create_lead` — `email` required; optional `contact_name`, `company_name`,
  `phone`, `whatsapp`, `source` (default `mcp`), `stage` (default `new_lead`).
  Records a `note` activity "Lead created via MCP".
- `update_lead_stage` — `lead_id` + `stage`. Updates stage + `updated_at`,
  records a `stage_change` activity "Moved to &lt;label&gt; via MCP".
- `add_activity` — `lead_id` + `type` (`note` | `email` | `call` | `whatsapp` |
  `feedback`) + `content`.
- `set_followup` — `lead_id` + `next_followup` (`YYYY-MM-DD`). Updates the date,
  records a `note` activity.

The 8 valid pipeline stages (exact): `new_lead`, `verification`,
`first_whatsapp_sent`, `company_created`, `sample_selection`,
`sample_order_done`, `feedback_pending`, `first_paid_order` — plus `lost`.

## Authentication

Every tool requires an `api_key` argument that must equal the server's
`MCP_API_KEY` env var (constant-time compared). The server refuses to start if
`MCP_API_KEY`, the Supabase URL, or the service-role key are missing.

## Required environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes* | Supabase project URL. `NEXT_PUBLIC_SUPABASE_URL` is used as a fallback. |
| `NEXT_PUBLIC_SUPABASE_URL` | * | Fallback for `SUPABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service-role key. Server-side only — never expose to clients. |
| `MCP_API_KEY` | yes | Shared secret. Must also be passed as the `api_key` argument on every tool call. |

\* At least one of `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` must be set.

## Build & run

```bash
cd mcp
npm install
npm run build      # compiles src -> dist (produces dist/index.js)
npm start          # runs node dist/index.js
```

The server speaks stdio, so when launched manually it will wait for an MCP client
to connect. Normally you let your MCP client launch it (see below).

## Add to Claude (claude_desktop_config.json)

Add an entry under `mcpServers`, pointing at the built `dist/index.js` with an
absolute path:

```json
{
  "mcpServers": {
    "grow-nest-crm": {
      "command": "node",
      "args": ["/absolute/path/to/B2B-lead-CRM/mcp/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://YOUR-PROJECT.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR-SERVICE-ROLE-KEY",
        "MCP_API_KEY": "YOUR-SHARED-SECRET"
      }
    }
  }
}
```

Build first (`npm run build`) so `dist/index.js` exists. Restart your MCP client
after editing the config.
