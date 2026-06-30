"use client";

import { useMemo } from "react";
import type { Lead } from "@/lib/types";
import { isAtOrAfter, stageLabel } from "@/lib/stages";
import { initials, qualityStyle, leadDisplayName, colorFor, formatDate } from "@/lib/design";
import { useLeads } from "./useLeads";
import LeadDrawer from "../LeadDrawer";

// A "sample" is any lead that has reached the Sample Selection stage or beyond.
// We surface the sample-tracking fields here.
const STEPS = ["Selecting", "Ordered", "Feedback"];

function sampleStep(lead: Lead): number {
  if (isAtOrAfter(lead.stage, "feedback_pending")) return 3;
  if (isAtOrAfter(lead.stage, "sample_order_done")) return 2;
  if (isAtOrAfter(lead.stage, "sample_selection")) return 1;
  return 0;
}

export default function SamplesView({
  initialLeads,
  userId,
}: {
  initialLeads: Lead[];
  userId: string;
}) {
  const { leads, selected, openLead, closeLead, applyUpdate, removeLead } =
    useLeads(initialLeads);

  const samples = useMemo(
    () => leads.filter((l) => isAtOrAfter(l.stage, "sample_selection") && l.stage !== "lost"),
    [leads]
  );

  if (samples.length === 0) {
    return (
      <div className="rounded-[16px] border border-line bg-white px-5 py-[54px] text-center shadow-card">
        <div className="text-[15px] font-bold text-[#26302A]">No sample orders yet</div>
        <div className="mt-1 text-[13px] text-muted">Leads at the Sample Selection stage and beyond appear here.</div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-4">
        {samples.map((l) => {
          const step = sampleStep(l);
          const q = qualityStyle(l.lead_quality);
          return (
            <button
              key={l.id}
              onClick={() => openLead(l)}
              className="flex flex-col gap-4 rounded-[16px] border border-line bg-white p-5 text-left shadow-card transition hover:border-[#D7D7CD] hover:shadow-cardHover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: q.bg, color: q.color }}>
                    {initials(leadDisplayName(l))}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-bold text-ink">{leadDisplayName(l)}</div>
                    <div className="truncate text-[12.5px] font-semibold text-muted-soft">{l.company_name ?? l.email}</div>
                  </div>
                </div>
                <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-[#F1F1EB] px-2.5 py-1 text-[11px] font-bold text-muted-soft">
                  {stageLabel(l.stage)}
                </span>
              </div>

              <div className="flex items-start">
                {STEPS.map((label, i) => {
                  const done = step >= i + 1;
                  return (
                    <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="flex w-full items-center">
                        <div className="h-0.5 flex-1" style={{ background: i === 0 ? "transparent" : done ? "#0E7B57" : "#E2E2DA" }} />
                        <div
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2"
                          style={{ background: done ? "#0E7B57" : "#fff", borderColor: done ? "#0E7B57" : "#DDDDD4" }}
                        >
                          {done && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                        <div className="h-0.5 flex-1" style={{ background: i === STEPS.length - 1 ? "transparent" : step >= i + 2 ? "#0E7B57" : "#E2E2DA" }} />
                      </div>
                      <span className="text-center text-[10.5px] font-semibold text-muted-soft">{label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-[#F1F1EB] pt-4">
                <Cell label="Sample products" value={l.requested_products || "—"} span />
                <Cell label="Order #" value={l.sample_order_number || "—"} />
                <Cell label="Carrier" value={l.sample_carrier || "—"} />
                <Cell label="Tracking" value={l.sample_tracking || "—"} mono />
                <Cell label="Shipped" value={formatDate(l.sample_shipped_at)} />
                <Cell label="Feedback due" value={formatDate(l.feedback_due)} />
              </div>

              {l.owner_name && (
                <div className="flex items-center gap-2 border-t border-[#F1F1EB] pt-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: colorFor(l.owner_name) }}>
                    {initials(l.owner_name)}
                  </span>
                  <span className="text-[12px] text-muted-soft">Handled by <b className="font-bold text-muted-strong">{l.owner_name}</b></span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <LeadDrawer lead={selected} userId={userId} onClose={closeLead} onUpdated={applyUpdate} onDeleted={removeLead} />
      )}
    </>
  );
}

function Cell({ label, value, mono, span }: { label: string; value: string; mono?: boolean; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#A6AB9E]">{label}</div>
      <div className={`text-[12.5px] font-semibold text-muted-strong ${mono ? "break-all font-mono text-[12px]" : ""}`}>{value}</div>
    </div>
  );
}
