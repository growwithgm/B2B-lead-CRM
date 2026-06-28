#!/usr/bin/env node
/**
 * grow-nest-crm-mcp
 *
 * A self-contained Model Context Protocol (MCP) server exposing read and write
 * tools for the B2B Lead CRM, backed by Supabase Postgres.
 *
 * Transport: stdio
 * Auth: requires MCP_API_KEY (env) AND a per-call `api_key` argument that must
 *       match it (constant-time compare). Writes never delete data.
 */

import { timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Environment & startup validation                                           */
/* -------------------------------------------------------------------------- */

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const MCP_API_KEY = process.env.MCP_API_KEY ?? "";

function fail(message: string): never {
  process.stderr.write(`[grow-nest-crm-mcp] FATAL: ${message}\n`);
  process.exit(1);
}

if (!MCP_API_KEY) {
  fail(
    "MCP_API_KEY is not set. Refusing to start. Set MCP_API_KEY in the environment."
  );
}
if (!SUPABASE_URL) {
  fail(
    "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is not set. Refusing to start."
  );
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  fail("SUPABASE_SERVICE_ROLE_KEY is not set. Refusing to start.");
}

const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

/* -------------------------------------------------------------------------- */
/* Domain constants                                                           */
/* -------------------------------------------------------------------------- */

const STAGES = [
  "new_lead",
  "contacted",
  "account_created",
  "sample_ordered",
  "sample_shipped",
  "feedback",
  "won",
  "lost",
] as const;

const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  account_created: "Account Created",
  sample_ordered: "Sample Ordered",
  sample_shipped: "Sample Shipped",
  feedback: "Feedback",
  won: "Won",
  lost: "Lost",
};

const TERMINAL_STAGES = ["won", "lost"] as const;

const ACTIVITY_TYPES = ["note", "email", "call", "whatsapp", "feedback"] as const;

// Useful columns returned by list_leads / get_lead.
const LEAD_COLUMNS =
  "id, created_at, updated_at, contact_name, email, phone, whatsapp, company_name, " +
  "brand, requested_products, source, stage, next_followup, assigned_to, lead_score, " +
  "lead_quality, business_type, language, owner_name, next_action, last_contact_at";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const stageSchema = z.enum(STAGES);
const apiKeySchema = z.string().min(1).describe("Shared MCP_API_KEY used to authorize this call.");

/** Constant-time API key check. Returns true only on exact match. */
function apiKeyValid(provided: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(MCP_API_KEY, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function ok(result: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}

function err(message: string) {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: message }, null, 2),
      },
    ],
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Insert an activity row. Best-effort: returns any error message. */
async function insertActivity(
  leadId: string,
  type: string,
  content: string
): Promise<string | null> {
  const { error } = await supabase
    .from("activities")
    .insert({ lead_id: leadId, type, content });
  return error ? error.message : null;
}

/* -------------------------------------------------------------------------- */
/* Server                                                                     */
/* -------------------------------------------------------------------------- */

const server = new McpServer({
  name: "grow-nest-crm-mcp",
  version: "1.0.0",
});

/* ========================================================================== */
/* READ TOOLS (read-only)                                                     */
/* ========================================================================== */

server.registerTool(
  "list_leads",
  {
    title: "List leads",
    description:
      "Read-only. List up to 100 leads, optionally filtered by stage, a text " +
      "search across contact_name/company_name/email, and/or overdue follow-ups.",
    inputSchema: {
      api_key: apiKeySchema,
      stage: stageSchema.optional().describe("Filter by one of the 8 pipeline stages."),
      search: z
        .string()
        .optional()
        .describe("Case-insensitive match on contact_name, company_name, or email."),
      overdue: z
        .boolean()
        .optional()
        .describe("If true, only leads with next_followup < today and stage not won/lost."),
    },
  },
  async ({ api_key, stage, search, overdue }) => {
    if (!apiKeyValid(api_key)) return err("Unauthorized: invalid api_key.");
    try {
      let query = supabase
        .from("leads")
        .select(LEAD_COLUMNS)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (stage) query = query.eq("stage", stage);

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(
          `contact_name.ilike.${term},company_name.ilike.${term},email.ilike.${term}`
        );
      }

      if (overdue) {
        query = query
          .lt("next_followup", todayISO())
          .not("stage", "in", `(${TERMINAL_STAGES.join(",")})`);
      }

      const { data, error } = await query;
      if (error) return err(error.message);
      return ok({ count: data?.length ?? 0, leads: data ?? [] });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "get_lead",
  {
    title: "Get lead",
    description:
      "Read-only. Fetch a single lead by id together with its most recent 50 activities.",
    inputSchema: {
      api_key: apiKeySchema,
      id: z.string().uuid().describe("Lead id (uuid)."),
    },
  },
  async ({ api_key, id }) => {
    if (!apiKeyValid(api_key)) return err("Unauthorized: invalid api_key.");
    try {
      const { data: lead, error: leadErr } = await supabase
        .from("leads")
        .select(LEAD_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (leadErr) return err(leadErr.message);
      if (!lead) return err(`No lead found with id ${id}.`);

      const { data: activities, error: actErr } = await supabase
        .from("activities")
        .select("id, lead_id, type, content, created_by, created_at")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (actErr) return err(actErr.message);

      return ok({ lead, activities: activities ?? [] });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "list_activities",
  {
    title: "List activities",
    description:
      "Read-only. List the most recent activities for a lead (default 50, max 200).",
    inputSchema: {
      api_key: apiKeySchema,
      lead_id: z.string().uuid().describe("Lead id (uuid)."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe("How many recent activities to return (default 50)."),
    },
  },
  async ({ api_key, lead_id, limit }) => {
    if (!apiKeyValid(api_key)) return err("Unauthorized: invalid api_key.");
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("id, lead_id, type, content, created_by, created_at")
        .eq("lead_id", lead_id)
        .order("created_at", { ascending: false })
        .limit(limit ?? 50);
      if (error) return err(error.message);
      return ok({ count: data?.length ?? 0, activities: data ?? [] });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

/* ========================================================================== */
/* WRITE TOOLS (guarded; never delete; each records an activity)              */
/* ========================================================================== */

server.registerTool(
  "create_lead",
  {
    title: "Create lead",
    description:
      "Guarded write. Create a new lead (email required) and record a 'Lead created via MCP' note.",
    inputSchema: {
      api_key: apiKeySchema,
      email: z.string().email().describe("Lead email (required)."),
      contact_name: z.string().optional(),
      company_name: z.string().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      source: z.string().optional().describe("Lead source (default 'mcp')."),
      stage: stageSchema.optional().describe("Initial pipeline stage (default 'new_lead')."),
    },
  },
  async ({ api_key, email, contact_name, company_name, phone, whatsapp, source, stage }) => {
    if (!apiKeyValid(api_key)) return err("Unauthorized: invalid api_key.");
    try {
      const insertRow: Record<string, unknown> = {
        email,
        source: source ?? "mcp",
        stage: stage ?? "new_lead",
      };
      if (contact_name !== undefined) insertRow.contact_name = contact_name;
      if (company_name !== undefined) insertRow.company_name = company_name;
      if (phone !== undefined) insertRow.phone = phone;
      if (whatsapp !== undefined) insertRow.whatsapp = whatsapp;

      const { data: lead, error } = await supabase
        .from("leads")
        .insert(insertRow)
        .select(LEAD_COLUMNS)
        .single();
      if (error) return err(error.message);

      const newLeadId = (lead as unknown as { id: string }).id;
      const activityErr = await insertActivity(
        newLeadId,
        "note",
        "Lead created via MCP"
      );

      return ok({
        lead,
        activity_recorded: activityErr === null,
        activity_error: activityErr,
      });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "update_lead_stage",
  {
    title: "Update lead stage",
    description:
      "Guarded write. Move a lead to one of the 8 valid stages and record a 'stage_change' activity.",
    inputSchema: {
      api_key: apiKeySchema,
      lead_id: z.string().uuid().describe("Lead id (uuid)."),
      stage: stageSchema.describe("Target stage (must be one of the 8 valid stages)."),
    },
  },
  async ({ api_key, lead_id, stage }) => {
    if (!apiKeyValid(api_key)) return err("Unauthorized: invalid api_key.");
    try {
      const { data: lead, error } = await supabase
        .from("leads")
        .update({ stage, updated_at: new Date().toISOString() })
        .eq("id", lead_id)
        .select(LEAD_COLUMNS)
        .maybeSingle();
      if (error) return err(error.message);
      if (!lead) return err(`No lead found with id ${lead_id}.`);

      const label = STAGE_LABELS[stage];
      const activityErr = await insertActivity(
        lead_id,
        "stage_change",
        `Moved to ${label} via MCP`
      );

      return ok({
        lead,
        activity_recorded: activityErr === null,
        activity_error: activityErr,
      });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "add_activity",
  {
    title: "Add activity",
    description:
      "Guarded write. Append an activity (note/email/call/whatsapp/feedback) to a lead.",
    inputSchema: {
      api_key: apiKeySchema,
      lead_id: z.string().uuid().describe("Lead id (uuid)."),
      type: z.enum(ACTIVITY_TYPES).describe("Activity type."),
      content: z.string().min(1).describe("Activity content/body."),
    },
  },
  async ({ api_key, lead_id, type, content }) => {
    if (!apiKeyValid(api_key)) return err("Unauthorized: invalid api_key.");
    try {
      const { data, error } = await supabase
        .from("activities")
        .insert({ lead_id, type, content })
        .select("id, lead_id, type, content, created_by, created_at")
        .single();
      if (error) return err(error.message);
      return ok({ activity: data });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "set_followup",
  {
    title: "Set follow-up date",
    description:
      "Guarded write. Set a lead's next_followup date (YYYY-MM-DD) and record a note.",
    inputSchema: {
      api_key: apiKeySchema,
      lead_id: z.string().uuid().describe("Lead id (uuid)."),
      next_followup: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "next_followup must be a YYYY-MM-DD date string.")
        .describe("Follow-up date in YYYY-MM-DD format."),
    },
  },
  async ({ api_key, lead_id, next_followup }) => {
    if (!apiKeyValid(api_key)) return err("Unauthorized: invalid api_key.");

    // Reject impossible calendar dates (regex alone allows e.g. 2026-13-40).
    const parsed = new Date(`${next_followup}T00:00:00Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== next_followup
    ) {
      return err(`Invalid calendar date: ${next_followup}.`);
    }

    try {
      const { data: lead, error } = await supabase
        .from("leads")
        .update({ next_followup, updated_at: new Date().toISOString() })
        .eq("id", lead_id)
        .select(LEAD_COLUMNS)
        .maybeSingle();
      if (error) return err(error.message);
      if (!lead) return err(`No lead found with id ${lead_id}.`);

      const activityErr = await insertActivity(
        lead_id,
        "note",
        `Follow-up set to ${next_followup} via MCP`
      );

      return ok({
        lead,
        activity_recorded: activityErr === null,
        activity_error: activityErr,
      });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[grow-nest-crm-mcp] ready on stdio.\n");
}

main().catch((e) => {
  fail(e instanceof Error ? e.message : String(e));
});
