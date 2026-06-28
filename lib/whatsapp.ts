// WhatsApp send adapter — routes through the wasify app so all threads/logs
// live there. Calls wasify's machine-callable outbound endpoint:
//
//   POST {WHATSAPP_API_BASE_URL}/api/outbound/send
//   Authorization: Bearer {WHATSAPP_API_TOKEN}
//   { "to": "+34600000000", "message": "..." }
//        or { "to": "...", "template": "name", "variables": [...], "language": "es" }
//   → 200 { ok: true, whatsapp_message_id, conversation_id, contact_id }
//
// SERVER-SIDE ONLY — never import this into a client component (it reads the
// bearer token from the environment).
//
// Env vars (server-side only):
//   WHATSAPP_API_BASE_URL  wasify origin, e.g. https://wasify-one.vercel.app
//   WHATSAPP_API_TOKEN     the WACRM_API_TOKEN bearer configured in wasify
//   WHATSAPP_SENDER        optional; unused by wasify (it resolves the sender
//                          from its own WhatsApp config) — kept for parity.
//
// When the env vars are unset the adapter reports a graceful "not configured"
// result (status 0) instead of throwing, so the UI can show a hint.

export interface SendWhatsAppResult {
  ok: boolean;
  status: number;
  providerId?: string;
  error?: string;
  raw?: unknown;
}

export interface SendWhatsAppArgs {
  to: string;
  // Free-text message (24h window) …
  message?: string;
  // … or a pre-approved template (first-touch / outside the window).
  template?: string;
  variables?: string[];
  language?: string;
}

// Pull the provider message id out of wasify's response (or a generic body).
function pickProviderId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;
  const candidates = [
    "whatsapp_message_id",
    "message_id",
    "messageId",
    "id",
    "sid",
  ];
  for (const key of candidates) {
    const value = obj[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

// Best-effort error string from a parsed (or raw text) response body.
function pickErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim().length > 0) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const direct = obj["error"] ?? obj["message"] ?? obj["error_message"];
    if (typeof direct === "string" && direct.length > 0) return direct;
    if (direct && typeof direct === "object") {
      const nested = (direct as Record<string, unknown>)["message"];
      if (typeof nested === "string" && nested.length > 0) return nested;
    }
  }
  return fallback;
}

export async function sendWhatsAppMessage(
  args: SendWhatsAppArgs
): Promise<SendWhatsAppResult> {
  const { to, message, template, variables, language } = args;

  const baseUrl = process.env.WHATSAPP_API_BASE_URL;
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!baseUrl || !token) {
    return { ok: false, status: 0, error: "WhatsApp API not configured" };
  }

  if (!message && !template) {
    return { ok: false, status: 0, error: "message or template is required" };
  }

  // wasify exposes the send endpoint at /api/outbound/send. Tolerate a base
  // url given with or without a trailing slash (and one already including the
  // path, in case it's configured that way).
  const trimmed = baseUrl.replace(/\/+$/, "");
  const endpoint = trimmed.endsWith("/api/outbound/send")
    ? trimmed
    : `${trimmed}/api/outbound/send`;

  const payload: Record<string, unknown> = { to };
  if (message) {
    payload.message = message;
  } else {
    payload.template = template;
    if (variables && variables.length > 0) payload.variables = variables;
    if (language) payload.language = language;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "network error";
    return { ok: false, status: 0, error };
  }

  // Parse defensively — the response may not be valid JSON.
  const text = await response.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  // wasify returns { ok: true, ... } on success; treat a 2xx with ok:false
  // (shouldn't happen) as a failure too.
  const bodyOk =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>).ok === true
      : false;

  if (response.ok && bodyOk) {
    return {
      ok: true,
      status: response.status,
      providerId: pickProviderId(parsed),
      raw: parsed,
    };
  }

  return {
    ok: false,
    status: response.status,
    error: pickErrorMessage(parsed, `HTTP ${response.status}`),
    raw: parsed,
  };
}

// Normalize a phone number to a best-effort E.164 string.
//   - returns null for empty input
//   - strips all non-digits, preserving a single leading "+"
//   - converts a leading "00" (international prefix) to "+"
//   - prefixes defaultCc (default "34" / Spain) for bare national numbers
export function normalizeE164(
  raw: string | null | undefined,
  defaultCc: string = "34"
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (digits === "") return null;

  if (hasPlus) {
    return `+${digits}`;
  }

  // Leading "00" is an international dialing prefix -> "+".
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    if (digits === "") return null;
    return `+${digits}`;
  }

  // Bare national number -> prefix the default country code.
  return `+${defaultCc}${digits}`;
}
