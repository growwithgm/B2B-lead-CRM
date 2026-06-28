"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types";
import { STAGES, STAGE_LABELS, stageLabel, stageMeta } from "@/lib/stages";
import {
  cx,
  initials,
  colorFor,
  qualityStyle,
  scoreStyle,
  leadDisplayName,
  formatDate,
} from "@/lib/design";
import { IconSearch, IconClose } from "../shell/icons";
import { useLeads } from "./useLeads";
import LeadDrawer from "../LeadDrawer";

export default function LeadsTableView({
  initialLeads,
  userId,
  initialSearch = "",
}: {
  initialLeads: Lead[];
  userId: string;
  initialSearch?: string;
}) {
  const { leads, selected, openLead, closeLead, applyUpdate, removeLead } =
    useLeads(initialLeads);

  const [search, setSearch] = useState(initialSearch);
  const [fStage, setFStage] = useState("all");
  const [fQuality, setFQuality] = useState("all");
  const [fCity, setFCity] = useState("all");

  const cities = useMemo(
    () => Array.from(new Set(leads.map((l) => l.ship_city).filter(Boolean))) as string[],
    [leads]
  );

  const anyFilter =
    fStage !== "all" || fQuality !== "all" || fCity !== "all" || search.trim() !== "";

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (fStage !== "all" && l.stage !== fStage) return false;
      if (fQuality !== "all" && l.lead_quality !== fQuality) return false;
      if (fCity !== "all" && l.ship_city !== fCity) return false;
      if (q) {
        const hay = [
          l.contact_name,
          l.company_name,
          l.email,
          l.ship_city,
          l.requested_products,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, fStage, fQuality, fCity]);

  function reset() {
    setSearch("");
    setFStage("all");
    setFQuality("all");
    setFCity("all");
  }

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0 flex-1 basis-[230px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A6AB9E]">
            <IconSearch size={16} strokeWidth={1.8} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, business, email, city…"
            className="h-10 w-full rounded-[10px] border border-line bg-white pl-9 pr-3 text-[13.5px] text-[#26302A] focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </div>
        <FilterSelect value={fStage} onChange={setFStage} options={[{ value: "all", label: "All stages" }, ...STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))]} />
        <FilterSelect value={fQuality} onChange={setFQuality} options={[{ value: "all", label: "All scores" }, { value: "hot", label: "Hot" }, { value: "warm", label: "Warm" }, { value: "cold", label: "Cold" }]} />
        <FilterSelect value={fCity} onChange={setFCity} options={[{ value: "all", label: "All cities" }, ...cities.map((c) => ({ value: c, label: c }))]} />
        {anyFilter && (
          <button
            onClick={reset}
            className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-line bg-white px-3 text-[13px] font-semibold text-muted-soft transition hover:bg-[#F4F4EF]"
          >
            <IconClose size={14} /> Reset
          </button>
        )}
      </div>

      <div className="mb-2.5 text-[12.5px] font-medium text-muted">
        <b className="font-bold text-[#26302A]">{rows.length}</b> leads
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[16px] border border-line bg-white px-5 py-[54px] text-center shadow-card">
          <div className="text-[15px] font-bold text-[#26302A]">No leads match your filters</div>
          <div className="mt-1 text-[13px] text-muted">Try adjusting your search or filters.</div>
          {anyFilter && (
            <button
              onClick={reset}
              className="mt-4 rounded-[9px] bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-line bg-white shadow-card">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#EFEFE9] bg-[#FBFBF9]">
                {["Lead", "Business", "Email", "Phone", "City", "Stage", "Score", "Assigned", "Next action", "Created"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const meta = stageMeta(l.stage);
                const q = qualityStyle(l.lead_quality);
                const sc = scoreStyle(l.lead_score);
                const name = leadDisplayName(l);
                return (
                  <tr
                    key={l.id}
                    onClick={() => openLead(l)}
                    className="cursor-pointer border-t border-[#F1F1EB] transition hover:bg-[#FAFAF6]"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                          style={{ background: q.bg, color: q.color }}
                        >
                          {initials(name)}
                        </span>
                        <span className="whitespace-nowrap text-[13.5px] font-bold text-ink">{name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[13px] font-semibold text-muted-strong">{l.company_name ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-muted-soft">{l.email}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-muted-soft">{l.whatsapp || l.phone || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-muted-strong">{l.ship_city ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                        style={{ background: meta.bg, color: meta.text }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
                        {stageLabel(l.stage)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {l.lead_score != null && l.lead_score > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-[38px] overflow-hidden rounded-full bg-[#EFEFE9]">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, l.lead_score)}%`, background: sc.color }} />
                          </div>
                          <span className="font-mono text-[12.5px] font-semibold" style={{ color: sc.color }}>{l.lead_score}</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {l.owner_name ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: colorFor(l.owner_name) }}>
                            {initials(l.owner_name)}
                          </span>
                          <span className="text-[12.5px] text-muted-strong">{l.owner_name}</span>
                        </div>
                      ) : (
                        <span className="text-[12.5px] text-muted">Unassigned</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-muted-soft">{l.next_action ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12.5px] text-muted-soft">{formatDate(l.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <LeadDrawer lead={selected} userId={userId} onClose={closeLead} onUpdated={applyUpdate} onDeleted={removeLead} />
      )}
    </>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-[10px] border border-line bg-white px-3 text-[13px] font-semibold text-muted-strong focus:border-brand"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
