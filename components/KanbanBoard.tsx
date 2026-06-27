"use client";

import { useMemo, useRef, useState } from "react";
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
import KanbanColumn from "./KanbanColumn";
import StatsBar from "./StatsBar";
import LeadDrawer from "./LeadDrawer";

export default function KanbanBoard({
  initialLeads,
  userId,
}: {
  initialLeads: Lead[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Timestamp of the last drag end, used to ignore the click that browsers
  // fire on pointer-up right after a drag (which would wrongly open the drawer).
  const lastDragEnd = useRef(0);

  // Require a small drag distance so clicks still open the drawer.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const stage of STAGES) map[stage] = [];
    for (const lead of leads) {
      (map[lead.stage] ?? (map[lead.stage] = [])).push(lead);
    }
    return map;
  }, [leads]);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  function applyLeadUpdate(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  function removeLead(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelectedId(null);
  }

  function openLead(lead: Lead) {
    if (Date.now() - lastDragEnd.current < 200) return;
    setSelectedId(lead.id);
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

    // Optimistic update.
    const previousStage = lead.stage;
    applyLeadUpdate({ ...lead, stage: newStage });

    const { error } = await supabase
      .from("leads")
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) {
      // Roll back on failure.
      applyLeadUpdate({ ...lead, stage: previousStage });
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
      <StatsBar leads={leads} />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="scrollbar-thin mx-auto max-w-[1600px] overflow-x-auto px-4 pb-8">
          <div className="flex gap-4">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                label={STAGE_LABELS[stage]}
                leads={byStage[stage] ?? []}
                onOpen={openLead}
              />
            ))}
          </div>
        </div>
      </DndContext>

      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          userId={userId}
          onClose={() => setSelectedId(null)}
          onUpdated={applyLeadUpdate}
          onDeleted={removeLead}
        />
      )}
    </>
  );
}
