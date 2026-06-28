// Shared presentation helpers for the redesigned UI.
// Pure functions only — safe to import from server or client components.

import type { Lead, LeadQuality } from "./types";

export const TEAM_COLORS = [
  "#0E7B57",
  "#1F7A9E",
  "#6C53C7",
  "#C77F1A",
  "#2E8E8E",
  "#B0524C",
];

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function initials(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "—";
  return n
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Deterministic avatar color from a string, so the same owner/lead is stable.
export function colorFor(seed: string | null | undefined): string {
  const s = seed ?? "";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TEAM_COLORS[h % TEAM_COLORS.length];
}

export type Swatch = { bg: string; color: string };

export function qualityStyle(q: LeadQuality | null | undefined): Swatch {
  switch (q) {
    case "hot":
      return { bg: "#FBE9E8", color: "#C5362F" };
    case "warm":
      return { bg: "#FBF1DA", color: "#A66A09" };
    case "cold":
      return { bg: "#E9EFF3", color: "#4F7390" };
    default:
      return { bg: "#EFEFED", color: "#6B7268" };
  }
}

export function qualityLabel(q: LeadQuality | null | undefined): string {
  return q ? q[0].toUpperCase() + q.slice(1) : "—";
}

export function scoreStyle(score: number | null | undefined): Swatch {
  const s = score ?? 0;
  if (s >= 80) return { color: "#0A5A40", bg: "#E2F1EA" };
  if (s >= 60) return { color: "#A66A09", bg: "#FBF1DA" };
  return { color: "#B0524C", bg: "#FBEAE9" };
}

export function leadTitle(lead: Pick<Lead, "company_name" | "contact_name" | "email">): string {
  return lead.company_name || lead.contact_name || lead.email;
}

export function leadDisplayName(lead: Pick<Lead, "contact_name" | "company_name" | "email">): string {
  return lead.contact_name || lead.company_name || lead.email;
}

export function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 864e5);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function dueLabel(date: string | null | undefined): string {
  if (!date) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 864e5);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `In ${days}d`;
}

export function truncate(text: string | null | undefined, max = 70): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

// Normalize a phone/whatsapp string toward E.164 for tel/wa links + the API.
// Conservative: strips spaces/punctuation, keeps a leading +, prefixes a
// default country code only when the number is clearly local.
export function toE164(raw: string | null | undefined, defaultCc = "34"): string | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[^\d+]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("+")) return "+" + s.slice(1).replace(/\D/g, "");
  // Bare national number → assume default country code.
  return "+" + defaultCc + s.replace(/\D/g, "");
}
