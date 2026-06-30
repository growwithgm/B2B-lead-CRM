"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Activity, ActivityType } from "@/lib/types";
import { formatDateTime } from "@/lib/design";

const TYPE_LABELS: Record<ActivityType, string> = {
  note: "Note",
  stage_change: "Stage change",
  stage_undo: "Undo",
  sample_sent: "Sample sent",
  feedback: "Feedback",
  email: "Email",
  call: "Call",
  whatsapp: "WhatsApp",
  shopify: "Shopify",
};

const TYPE_STYLES: Record<ActivityType, string> = {
  note: "bg-neutral-100 text-neutral-600",
  stage_change: "bg-blue-50 text-blue-600",
  stage_undo: "bg-orange-50 text-orange-700",
  sample_sent: "bg-amber-50 text-amber-700",
  feedback: "bg-purple-50 text-purple-700",
  email: "bg-neutral-100 text-neutral-600",
  call: "bg-neutral-100 text-neutral-600",
  whatsapp: "bg-[#E3F3EA] text-[#1F8A5B]",
  shopify: "bg-[#ECE9F7] text-[#574099]",
};

export default function ActivityTimeline({
  leadId,
  userId,
  refreshKey = 0,
}: {
  leadId: string;
  userId: string;
  refreshKey?: number;
}) {
  const [supabase] = useState(() => createClient());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    setActivities((data ?? []) as Activity[]);
    setLoading(false);
  }, [supabase, leadId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const content = note.trim();
    if (!content) return;
    setSaving(true);

    const { error } = await supabase.from("activities").insert({
      lead_id: leadId,
      type: "note",
      content,
      created_by: userId,
    });

    setSaving(false);
    if (!error) {
      setNote("");
      load();
    }
  }

  return (
    <div>
      <form onSubmit={addNote} className="mb-4">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Add a note…"
          className="w-full resize-none rounded-[10px] border border-line bg-white px-3 py-2 text-sm text-[#26302A] focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving || !note.trim()}
            className="rounded-[9px] bg-brand px-3 py-1.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add note"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-muted">Loading activity…</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {activities.map((a) => (
            <li key={a.id} className="flex gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-neutral-300" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                      TYPE_STYLES[a.type] ?? TYPE_STYLES.note,
                    ].join(" ")}
                  >
                    {TYPE_LABELS[a.type] ?? a.type}
                  </span>
                  <span className="text-xs text-[#A6AB9E]">
                    {formatDateTime(a.created_at)}
                  </span>
                </div>
                {a.content && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#3E463C]">
                    {a.content}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
