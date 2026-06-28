"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";

// Shared leads + drawer state used by every view. Keeps optimistic updates
// from the drawer (edits, stage changes, deletes) in sync with the list.
export function useLeads(initial: Lead[]) {
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  return {
    leads,
    setLeads,
    selected,
    openLead: (lead: Lead) => setSelectedId(lead.id),
    closeLead: () => setSelectedId(null),
    applyUpdate: (updated: Lead) =>
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l))),
    removeLead: (id: string) => {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setSelectedId(null);
    },
  };
}
