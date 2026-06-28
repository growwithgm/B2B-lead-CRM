"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/types";
import { STAGES, STAGE_LABELS, stageMeta, stageLabel, stageIndex } from "@/lib/stages";
import {
  initials,
  colorFor,
  leadDisplayName,
  isOverdue,
  dueLabel,
  relTime,
} from "@/lib/design";
import { IconChevronRight } from "../shell/icons";
import { useLeads } from "./useLeads";
import LeadDrawer from "../LeadDrawer";

export default function DashboardView({
  initialLeads,
  userId,
}: {
  initialLeads: Lead[];
  userId: string;
}) {
  const { leads, selected, openLead, closeLead, applyUpdate, removeLead } =
    useLeads(initialLeads);

  const stats = useMemo(() => {
    const total = leads.length;
    const active = leads.filter((l) => l.stage !== "lost");
    const newWeek = leads.filter(
      (l) => Date.now() - new Date(l.created_at).getTime() < 7 * 864e5
    ).length;
    const qualified = active.filter((l) => stageIndex(l.stage) >= 2).length;
    const samplesSent = active.filter((l) => stageIndex(l.stage) >= 3).length;
    const feedback = leads.filter((l) => l.stage === "feedback").length;
    const won = leads.filter((l) => l.stage === "won").length;
    const overdue = leads.filter(
      (l) => isOverdue(l.next_followup) && l.stage !== "won" && l.stage !== "lost"
    ).length;
    const convRate = total ? (won / total) * 100 : 0;
    return { total, newWeek, qualified, samplesSent, feedback, won, overdue, convRate };
  }, [leads]);

  const funnel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of STAGES) counts[s] = 0;
    for (const l of leads) counts[l.stage] = (counts[l.stage] ?? 0) + 1;
    const max = Math.max(1, ...STAGES.map((s) => counts[s]));
    return STAGES.map((s) => ({
      stage: s,
      label: STAGE_LABELS[s],
      count: counts[s],
      pct: Math.max(6, Math.round((counts[s] / max) * 100)),
      ...stageMeta(s),
    }));
  }, [leads]);

  const dueSoon = useMemo(
    () =>
      leads
        .filter((l) => l.next_followup && l.stage !== "won" && l.stage !== "lost")
        .sort((a, b) => (a.next_followup! < b.next_followup! ? -1 : 1))
        .slice(0, 5),
    [leads]
  );

  const recent = useMemo(
    () =>
      [...leads]
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
        .slice(0, 7),
    [leads]
  );

  const week = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts = new Array(7).fill(0);
    for (const l of leads) {
      const d = new Date(l.created_at);
      const age = Math.floor((Date.now() - d.getTime()) / 864e5);
      if (age >= 0 && age < 7) {
        const dow = (d.getDay() + 6) % 7; // Mon=0
        counts[dow] += 1;
      }
    }
    const max = Math.max(1, ...counts);
    return labels.map((label, i) => ({ label, pct: Math.round((counts[i] / max) * 100) }));
  }, [leads]);

  const kpis = [
    { label: "Total Leads", value: stats.total, sub: "all sources" },
    { label: "New This Week", value: stats.newWeek, sub: "last 7 days" },
    { label: "Qualified", value: stats.qualified, sub: "account created+" },
    { label: "Samples Sent", value: stats.samplesSent, sub: "in market" },
    { label: "Feedback", value: stats.feedback, sub: "awaiting reply" },
    { label: "Won", value: stats.won, sub: "converted" },
    { label: "Conversion Rate", value: `${stats.convRate.toFixed(1)}%`, sub: "lead → won" },
    { label: "Overdue Follow-ups", value: stats.overdue, sub: "action needed", danger: stats.overdue > 0 },
  ];

  const convDeg = stats.convRate * 3.6;

  return (
    <>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4 shadow-card">
            <span className="text-[12px] font-semibold text-muted-soft">{k.label}</span>
            <div className="flex items-end gap-2">
              <span
                className={`text-[29px] font-extrabold leading-none tracking-tight ${k.danger ? "text-[#C5362F]" : "text-ink"}`}
              >
                {k.value}
              </span>
              <span className="truncate pb-1 text-[12px] font-medium text-muted">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        {/* Pipeline overview */}
        <div className="min-w-0 flex-[2_1_440px] rounded-[16px] border border-line bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[14.5px] font-extrabold tracking-tight text-ink">Pipeline overview</div>
              <div className="mt-px text-[12.5px] text-muted">Active leads by stage</div>
            </div>
            <Link href="/pipeline" className="flex items-center gap-1 text-[12.5px] font-bold text-brand hover:text-brand-dark">
              Open board <IconChevronRight size={14} />
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {funnel.map((f) => (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="flex w-[118px] flex-shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-[#5C635A]">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: f.dot }} />
                  {f.label}
                </span>
                <div className="relative h-[26px] flex-1 overflow-hidden rounded-[7px] bg-[#F3F3EE]">
                  <div
                    className="flex h-full items-center justify-end rounded-[7px] pr-2.5 text-[12px] font-bold text-white"
                    style={{ width: `${f.pct}%`, background: f.dot, minWidth: 26 }}
                  >
                    {f.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-ups due */}
        <div className="flex min-w-0 flex-[1_1_300px] flex-col rounded-[16px] border border-line bg-white p-4 shadow-card">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <div className="text-[14.5px] font-extrabold tracking-tight text-ink">Follow-ups due</div>
            <Link href="/followups" className="text-[12.5px] font-bold text-brand hover:text-brand-dark">View all</Link>
          </div>
          {dueSoon.length === 0 ? (
            <p className="px-1 py-6 text-[13px] text-muted">No upcoming follow-ups.</p>
          ) : (
            <div className="flex flex-col">
              {dueSoon.map((l) => {
                const overdue = isOverdue(l.next_followup);
                return (
                  <button
                    key={l.id}
                    onClick={() => openLead(l)}
                    className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition hover:bg-[#F6F6F1]"
                  >
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${overdue ? "bg-[#C5362F]" : "bg-[#C77F1A]"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-[#26302A]">{leadDisplayName(l)}</div>
                      <div className="truncate text-[11.5px] text-muted">{l.company_name ?? l.email}</div>
                    </div>
                    <span
                      className={`flex-shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[10.5px] font-bold ${overdue ? "bg-[#FBE9E8] text-[#C5362F]" : "bg-[#FBF1DA] text-[#A66A09]"}`}
                    >
                      {dueLabel(l.next_followup)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Recent activity */}
        <div className="min-w-0 flex-[2_1_440px] rounded-[16px] border border-line bg-white p-5 shadow-card">
          <div className="mb-3 text-[14.5px] font-extrabold tracking-tight text-ink">Recent activity</div>
          <div className="flex flex-col">
            {recent.map((l) => (
              <button
                key={l.id}
                onClick={() => openLead(l)}
                className="flex items-center gap-3 rounded-[10px] px-1 py-2 text-left transition hover:bg-[#F6F6F1]"
              >
                <span
                  className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: colorFor(l.owner_name || l.email) }}
                >
                  {initials(leadDisplayName(l))}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-[#26302A]">
                    <span className="font-bold">{leadDisplayName(l)}</span> · {l.next_action || stageLabel(l.stage)}
                  </div>
                  <div className="truncate text-[11.5px] text-muted">{l.company_name ?? l.email}</div>
                </div>
                <span className="flex-shrink-0 whitespace-nowrap text-[11.5px] font-medium text-muted">{relTime(l.updated_at)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Leads this week + conversion */}
        <div className="min-w-0 flex-[1_1_300px] rounded-[16px] border border-line bg-white p-5 shadow-card">
          <div className="text-[14.5px] font-extrabold tracking-tight text-ink">Leads this week</div>
          <div className="mb-3.5 text-[12.5px] text-muted">New leads per day</div>
          <div className="mb-4 flex h-[84px] items-end gap-2">
            {week.map((w) => (
              <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className="w-full max-w-[22px] rounded-t-[5px] bg-brand" style={{ height: `${Math.max(5, w.pct)}%` }} />
                <span className="text-[10.5px] font-semibold text-muted">{w.label}</span>
              </div>
            ))}
          </div>
          <div className="mb-4 h-px bg-[#EEEEE7]" />
          <div className="flex items-center gap-4">
            <div
              className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(#0E7B57 ${convDeg}deg, #EAEAE3 ${convDeg}deg)` }}
            >
              <div className="flex h-[57px] w-[57px] items-center justify-center rounded-full bg-white text-[15px] font-extrabold tracking-tight text-brand-deep">
                {stats.convRate.toFixed(0)}%
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-[#26302A]">Conversion rate</div>
              <div className="mt-0.5 text-[12px] text-muted">{stats.won} of {stats.total} leads won</div>
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <LeadDrawer lead={selected} userId={userId} onClose={closeLead} onUpdated={applyUpdate} onDeleted={removeLead} />
      )}
    </>
  );
}
