"use client";

import { useState } from "react";
import { STAGES, STAGE_LABELS } from "@/lib/stages";

const NOTIF = [
  { key: "overdueAlerts", label: "Overdue follow-up alerts", desc: "Notify when a task becomes overdue", on: true },
  { key: "newLeadAlerts", label: "New Klaviyo lead alerts", desc: "Ping when a lead lands from the webhook", on: true },
  { key: "weeklyDigest", label: "Weekly pipeline digest", desc: "A summary every Monday morning", on: false },
];

const INTEGRATIONS = [
  { name: "Klaviyo", desc: "Landing page lead capture (webhook)", bg: "#ECE9F7", color: "#574099" },
  { name: "Shopify", desc: "Customer accounts & order sync", bg: "#E2F1EA", color: "#0E7B57" },
  { name: "WhatsApp", desc: "Manual lead outreach", bg: "#E3F3EA", color: "#1F8A5B" },
];

export default function SettingsView({ userEmail }: { userEmail: string }) {
  const [notif, setNotif] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF.map((n) => [n.key, n.on]))
  );

  return (
    <div className="flex max-w-[1040px] flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
        <Card title="Workspace">
          <Row label="Workspace" value="GROW NEST B2B" />
          <Row label="Signed in as" value={userEmail} />
          <Row label="Default currency" value="EUR (€)" />
          <Row label="Default country" value="España (ES)" />
        </Card>

        <Card title="Notifications">
          {NOTIF.map((n) => (
            <div key={n.key} className="flex items-center justify-between gap-3.5 border-t border-[#F1F1EB] py-3.5 first:border-t-0">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#26302A]">{n.label}</div>
                <div className="mt-0.5 text-[11.5px] text-muted">{n.desc}</div>
              </div>
              <button
                onClick={() => setNotif((p) => ({ ...p, [n.key]: !p[n.key] }))}
                className="relative h-6 w-[42px] flex-shrink-0 rounded-full transition"
                style={{ background: notif[n.key] ? "#0E7B57" : "#D8D8D0" }}
                aria-pressed={notif[n.key]}
              >
                <span
                  className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all"
                  style={{ left: notif[n.key] ? 21 : 3 }}
                />
              </button>
            </div>
          ))}
        </Card>
      </div>

      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
        <Card title="Integrations">
          {INTEGRATIONS.map((it) => (
            <div key={it.name} className="flex items-center gap-3 border-t border-[#F1F1EB] py-3 first:border-t-0">
              <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] text-[13px] font-extrabold" style={{ background: it.bg, color: it.color }}>
                {it.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-[#26302A]">{it.name}</div>
                <div className="text-[11.5px] text-muted">{it.desc}</div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-bold text-brand-deep">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Configured via env
              </span>
            </div>
          ))}
        </Card>
      </div>

      <Card title="Pipeline stages" full>
        <div className="mb-3.5 text-[12.5px] text-muted">The {STAGES.length} stages a lead moves through, from capture to won.</div>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s, i) => (
            <span key={s} className="inline-flex items-center gap-2 rounded-full border border-line bg-[#F6F6F2] py-1.5 pl-1.5 pr-3 text-[12px] font-semibold text-muted-strong">
              <span className="flex h-[19px] w-[19px] items-center justify-center rounded-full bg-brand font-mono text-[10px] font-bold text-white">{i + 1}</span>
              {STAGE_LABELS[s]}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ title, full, children }: { title: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-[16px] border border-line bg-white p-5 shadow-card ${full ? "flex-[1_1_100%]" : ""}`}>
      <div className="mb-1 text-[14.5px] font-extrabold tracking-tight text-ink">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#F1F1EB] py-3 first:border-t-0">
      <span className="text-[13px] text-muted-soft">{label}</span>
      <span className="truncate text-[13px] font-bold text-[#26302A]">{value}</span>
    </div>
  );
}
