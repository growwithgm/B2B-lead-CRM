// Generic, ENV-CONFIGURABLE WhatsApp send adapter.
//
// The real provider spec was not known at build time, so the request shape is
// driven by env vars + sensible defaults. When you plug in your own WhatsApp
// app, set the env vars below and (if needed) tweak the request body in the
// clearly marked "adjust to match your provider" block inside sendWhatsAppMessage.
//
// Env vars (server-side only — never expose these to the browser):
//   WHATSAPP_API_BASE_URL  POST endpoint, e.g. https://api.example.com/v1/messages
//   WHATSAPP_API_TOKEN     bearer token
//   WHATSAPP_SENDER        sender id / from number

export interface SendWhatsAppResult {
  ok: boolean;
  status: number;
  providerId?: string;
  error?: string;
  raw?: unknown;
}

// Pull a provider message id out of a parsed JSON response, checking the
// field names commonly used across WhatsApp/SMS providers.
function pickProviderId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;
  const candidates = ["id", "message_id", "messageId", "sid"];
  for (const key of candidates) {
    const value = obj[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
  }
  // Some providers nest the id under data / messages[0].
  const data = obj["data"];
  if (data && typeof data === "object") {
    const nested = pickProviderId(data);
    if (nested) return nested;
  }
  const messages = obj["messages"];
  if (Array.isArray(messages) && messages.length > 0) {
    const nested = pickProviderId(messages[0]);
    if (nested) return nested;
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

export async function sendWhatsAppMessage({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<SendWhatsAppResult> {
  const baseUrl = process.env.WHATSAPP_API_BASE_URL;
  const token = process.env.WHATSAPP_API_TOKEN;
  const sender = process.env.WHATSAPP_SENDER;

  if (!baseUrl || !token) {
    return { ok: false, status: 0, error: "WhatsApp API not configured" };
  }

  // ---------------------------------------------------------------------------
  // adjust to match your provider — this is the one place to change the body
  // shape so it matches whatever WhatsApp app you wire up.
  // ---------------------------------------------------------------------------
  const body = {
    from: sender,
    to,
    type: "text",
    text: { body: message },
  };

  let response: Response;
  try {
    response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

  if (response.ok) {
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
