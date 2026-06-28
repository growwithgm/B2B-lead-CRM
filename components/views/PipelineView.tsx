"use client";

import { useMemo, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types";
import { STAGES, STAGE_LABELS, isStage, stageLabel } from "@/lib/stages";
import { useLeads } from "./useLeads";
import KanbanColumn from "../KanbanColumn";
import LeadDrawer from "../LeadDrawer";

export default function PipelineView({
  initialLeads,
  userId,
}: {
  initialLeads: Lead[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { leads, setLeads, selected, openLead, closeLead, applyUpdate, removeLead } =
    useLeads(initialLeads);
  const lastDragEnd = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const stage of STAGES) map[stage] = [];
    for (const lead of leads) (map[lead.stage] ?? (map[lead.stage] = [])).push(lead);
    return map;
  }, [leads]);

  function open(lead: Lead) {
    if (Date.now() - lastDragEnd.current < 200) return;
    openLead(lead);
  }

  async function handleDragEnd(event: DragEndEvent) {
    lastDragEnd.current = Date.now();
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const newStage = String(over.id);
    if (!isStage(newStage)) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    const fromLabel = stageLabel(lead.stage);
    const toLabel = stageLabel(newStage);
    const previousStage = lead.stage;

    // Optimistic update.
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );

    const { error } = await supabase
      .from("leads")
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: previousStage } : l))
      );
      console.error("Failed to update stage:", error.message);
      return;
    }

    await supabase.from("activities").insert({
      lead_id: leadId,
      type: "stage_change",
      content: `Moved: ${fromLabel} → ${toLabel}`,
      created_by: userId,
    });
  }

  return (
    <>
      <div className="mb-3.5 flex items-center gap-2 text-[12.5px] font-medium text-muted">
        Drag cards between columns to move a lead to a new stage.
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="scrollbar-thin flex items-start gap-3.5 overflow-x-auto pb-2.5">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              label={STAGE_LABELS[stage]}
              leads={byStage[stage] ?? []}
              onOpen={open}
            />
          ))}
        </div>
      </DndContext>

      {selected && (
        <LeadDrawer
          lead={selected}
          userId={userId}
          onClose={closeLead}
          onUpdated={applyUpdate}
          onDeleted={removeLead}
        />
      )}
    </>
  );
}
