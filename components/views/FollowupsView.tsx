"use client";

import { useMemo } from "react";
import type { Lead } from "@/lib/types";
import { stageLabel, isTerminal } from "@/lib/stages";
import { leadDisplayName, dueLabel, isOverdue } from "@/lib/design";
import { useLeads } from "./useLeads";
import LeadDrawer from "../LeadDrawer";

export default function FollowupsView({
  initialLeads,
  userId,
}: {
  initialLeads: Lead[];
  userId: string;
}) {
  const { leads, selected, openLead, closeLead, applyUpdate, removeLead } =
    useLeads(initialLeads);

  const groups = useMemo(() => {
    const withDue = leads.filter((l) => l.next_followup && !isTerminal(l.stage));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = (d: string) => {
      const t = new Date(d);
      t.setHours(0, 0, 0, 0);
      return t.getTime() === today.getTime();
    };
    return [
      { label: "Overdue", accent: "#C5362F", bg: "#FBE9E8", items: withDue.filter((l) => isOverdue(l.next_followup)) },
      { label: "Due today", accent: "#C77F1A", bg: "#F9EFDD", items: withDue.filter((l) => isToday(l.next_followup!)) },
      {
        label: "Upcoming",
        accent: "#1F7A9E",
        bg: "#E4F0F5",
        items: withDue
          .filter((l) => !isOverdue(l.next_followup) && !isToday(l.next_followup!))
          .sort((a, b) => (a.next_followup! < b.next_followup! ? -1 : 1)),
      },
    ].filter((g) => g.items.length > 0);
  }, [leads]);

  return (
    <>
      {groups.length === 0 ? (
        <div className="rounded-[16px] border border-line bg-white px-5 py-[54px] text-center shadow-card">
          <div className="text-[15px] font-bold text-[#26302A]">No follow-ups scheduled</div>
          <div className="mt-1 text-[13px] text-muted">Set a next follow-up date on a lead to see it here.</div>
        </div>
      ) : (
        <div className="flex max-w-[900px] flex-col gap-6">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="mb-3 flex items-center gap-2.5">
                <span className="h-[9px] w-[9px] rounded-full" style={{ background: g.accent }} />
                <span className="text-[14px] font-extrabold text-[#26302A]">{g.label}</span>
                <span className="rounded-full px-2.5 py-px text-[11.5px] font-bold" style={{ background: g.bg, color: g.accent }}>
                  {g.items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {g.items.map((l) => {
                  const overdue = isOverdue(l.next_followup);
                  return (
                    <button
                      key={l.id}
                      onClick={() => openLead(l)}
                      className="flex flex-wrap items-center gap-3.5 rounded-[12px] border bg-white px-4 py-3 text-left transition hover:bg-[#FAFAF6]"
                      style={{ borderColor: "#EDEDE6", borderLeft: overdue ? "3px solid #D9534F" : "1px solid #EDEDE6" }}
                    >
                      <div className="min-w-[140px] flex-1">
                        <div className="text-[13.5px] font-semibold text-[#26302A]">
                          {l.next_action || `Follow up — ${stageLabel(l.stage)}`}
                        </div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          <span className="font-semibold text-muted-soft">{leadDisplayName(l)}</span>
                          {l.company_name ? ` · ${l.company_name}` : ""}
                        </div>
                      </div>
                      <span
                        className={`w-[104px] whitespace-nowrap rounded-full px-2.5 py-1 text-center text-[11px] font-bold ${overdue ? "bg-[#FBE9E8] text-[#C5362F]" : "bg-[#EFEFED] text-muted-soft"}`}
                      >
                        {dueLabel(l.next_followup)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <LeadDrawer lead={selected} userId={userId} onClose={closeLead} onUpdated={applyUpdate} onDeleted={removeLead} />
      )}
    </>
  );
}
