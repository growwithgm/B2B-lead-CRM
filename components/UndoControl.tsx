"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, Activity } from "@/lib/types";
import { formatDateTime } from "@/lib/design";
import { IconClose } from "./shell/icons";

// Separate, deliberate "Undo a stage change" control. Marking a stage is one
// click/drag; undoing is intentionally a 2-step action (pick the change →
// confirm) placed away from the normal stage controls so a stray click does
// nothing.
export default function UndoControl({
  lead,
  onUndone,
}: {
  lead: Lead;
  onUndone: (lead: Lead) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState<Activity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function openPanel() {
    setOpen(true);
    setSelectedId(null);
    setMsg(null);
    setLoading(true);
    const { data } = await supabase
      .from("activities")
      .select("*")
      .eq("lead_id", lead.id)
      .eq("type", "stage_change")
      .order("created_at", { ascending: false })
      .limit(25);
    // Only changes that record a "From → To" can be reverted.
    setChanges(((data ?? []) as Activity[]).filter((a) => (a.content ?? "").includes("→")));
    setLoading(false);
  }

  function closePanel() {
    setOpen(false);
    setSelectedId(null);
    setMsg(null);
  }

  async function confirmUndo() {
    if (!selectedId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/leads/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, activityId: selectedId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg(json.error ?? "Undo failed");
      } else if (json.lead) {
        onUndone(json.lead as Lead);
        closePanel();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "network error");
    }
    setBusy(false);
  }

  return (
    <div className="mb-3.5 rounded-[14px] border border-[#E7DCC4] bg-[#FBF6EC] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: "#C77F1A" }} />
          <span className="text-[13.5px] font-extrabold text-ink">Undo a stage change</span>
        </div>
        {!open ? (
          <button
            onClick={openPanel}
            className="rounded-[9px] border border-[#E0CFA6] bg-white px-3 py-1.5 text-[12.5px] font-bold text-[#94600F] transition hover:bg-[#FCF3E1]"
          >
            Undo…
          </button>
        ) : (
          <button
            onClick={closePanel}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#E0CFA6] bg-white text-[#94600F] transition hover:bg-[#FCF3E1]"
            aria-label="Close undo"
          >
            <IconClose size={14} />
          </button>
        )}
      </div>

      {!open && (
        <p className="mt-1.5 text-[11.5px] text-[#9A7B3C]">
          Reverts a lead to the stage it was in before a past change. Separate from the normal
          stage controls so it can&apos;t happen by accident.
        </p>
      )}

      {open && (
        <div className="mt-3">
          {loading ? (
            <p className="text-[12.5px] text-muted">Loading stage history…</p>
          ) : changes.length === 0 ? (
            <p className="text-[12.5px] text-muted">No stage changes to undo yet.</p>
          ) : (
            <>
              <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#9A7B3C]">
                Step 1 — pick the change to undo
              </p>
              <div className="flex max-h-[210px] flex-col gap-1.5 overflow-y-auto">
                {changes.map((a) => {
                  const active = a.id === selectedId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(active ? null : a.id)}
                      className={[
                        "flex items-start gap-2 rounded-[10px] border px-3 py-2 text-left transition",
                        active
                          ? "border-[#C77F1A] bg-white ring-2 ring-[#C77F1A]/20"
                          : "border-[#ECDFC4] bg-white hover:border-[#E0CFA6]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mt-[3px] h-3 w-3 flex-shrink-0 rounded-full border-2",
                          active ? "border-[#C77F1A] bg-[#C77F1A]" : "border-[#D8C7A0] bg-white",
                        ].join(" ")}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-[#3E463C]">
                          {a.content}
                        </span>
                        <span className="text-[11px] text-muted">{formatDateTime(a.created_at)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedId && (
                <div className="mt-3 rounded-[10px] border border-[#E7DCC4] bg-white p-3">
                  <p className="mb-2 text-[12px] font-semibold text-[#94600F]">
                    Step 2 — revert the lead to the stage it was in before this change?
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedId(null)}
                      className="rounded-[9px] border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-muted-soft hover:bg-[#F4F4EF]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmUndo}
                      disabled={busy}
                      className="rounded-[9px] bg-[#C77F1A] px-3.5 py-1.5 text-[12.5px] font-bold text-white transition hover:bg-[#A8690F] disabled:opacity-50"
                    >
                      {busy ? "Undoing…" : "Confirm undo"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {msg && <p className="mt-2 text-[12px] text-red-600">{msg}</p>}
        </div>
      )}
    </div>
  );
}
