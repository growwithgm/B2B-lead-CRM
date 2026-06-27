"use client";

import type { Lead } from "@/lib/types";
import { STAGES, STAGE_LABELS } from "@/lib/stages";

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
}

export default function StatsBar({ leads }: { leads: Lead[] }) {
  const total = leads.length;
  const overdue = leads.filter(
    (l) => isOverdue(l.next_followup) && l.stage !== "won" && l.stage !== "lost"
  ).length;

  const perStage = STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: leads.filter((l) => l.stage === stage).length,
  }));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Stat label="Total leads" value={total} accent />
        <Stat label="Overdue follow-ups" value={overdue} danger={overdue > 0} />
        <div className="mx-1 hidden h-6 w-px bg-neutral-200 sm:block" />
        {perStage.map((s) => (
          <Stat key={s.stage} label={s.label} value={s.count} muted />
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  danger,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
        danger
          ? "border-red-200 bg-red-50 text-red-700"
          : accent
          ? "border-neutral-900 bg-neutral-900 text-white"
          : muted
          ? "border-neutral-200 bg-white text-neutral-600"
          : "border-neutral-200 bg-white text-neutral-700",
      ].join(" ")}
    >
      <span className="font-semibold tabular-nums">{value}</span>
      <span className={accent ? "text-neutral-300" : "text-neutral-500"}>
        {label}
      </span>
    </div>
  );
}
