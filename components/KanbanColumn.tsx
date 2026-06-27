"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Lead } from "@/lib/types";
import type { Stage } from "@/lib/stages";
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

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-neutral-700">{label}</h2>
        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={[
          "scrollbar-thin flex min-h-[120px] flex-1 flex-col gap-2 rounded-xl border p-2 transition",
          isOver
            ? "border-neutral-900 bg-neutral-200/60"
            : "border-neutral-200 bg-neutral-200/40",
        ].join(" ")}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onOpen={onOpen} />
        ))}
        {leads.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-neutral-400">
            Drop leads here
          </p>
        )}
      </div>
    </div>
  );
}
