"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Lead } from "@/lib/types";
import { STAGE_META, type Stage } from "@/lib/stages";
import LeadCard from "./LeadCard";

export default function KanbanColumn({
  stage,
  label,
  leads,
  onOpen,
}: {
  stage: Stage;
  label: string;
  leads: Lead[];
  onOpen: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = STAGE_META[stage];

  return (
    <div className="flex w-[288px] flex-shrink-0 flex-col gap-2.5">
      <div className="flex items-center gap-2 px-1 py-0.5">
        <span className="h-[9px] w-[9px] flex-shrink-0 rounded-full" style={{ background: meta.dot }} />
        <span className="flex-1 text-[13px] font-bold text-[#26302A]">{label}</span>
        <span
          className="rounded-full px-2.5 py-px text-[11.5px] font-bold"
          style={{ background: meta.bg, color: meta.text }}
        >
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex min-h-[140px] flex-1 flex-col gap-2.5 rounded-[12px] p-2 transition"
        style={{
          background: isOver ? "#E9F3EE" : "#F6F6F2",
          outline: isOver ? "2px dashed #6FB597" : "2px dashed transparent",
          outlineOffset: "-2px",
        }}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onOpen={onOpen} />
        ))}
        {leads.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-muted">Drop leads here</p>
        )}
      </div>
    </div>
  );
}
