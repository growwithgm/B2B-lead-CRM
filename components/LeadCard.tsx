"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Lead } from "@/lib/types";

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
}

function formatDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function truncate(text: string | null, max = 70): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export default function LeadCard({
  lead,
  onOpen,
}: {
  lead: Lead;
  onOpen: (lead: Lead) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  const title = lead.company_name || lead.contact_name || lead.email;
  const overdue = isOverdue(lead.next_followup);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(lead)}
      className="cursor-grab touch-none rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition hover:border-neutral-300 hover:shadow active:cursor-grabbing"
    >
      <p className="text-sm font-medium leading-snug text-neutral-900">
        {title}
      </p>
      {lead.company_name && lead.contact_name && (
        <p className="mt-0.5 text-xs text-neutral-500">{lead.contact_name}</p>
      )}
      {lead.requested_products && (
        <p className="mt-1.5 text-xs leading-snug text-neutral-500">
          {truncate(lead.requested_products)}
        </p>
      )}
      {lead.next_followup && (
        <p
          className={[
            "mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
            overdue
              ? "bg-red-50 text-red-600"
              : "bg-neutral-100 text-neutral-500",
          ].join(" ")}
        >
          {overdue ? "Overdue" : "Follow-up"} · {formatDate(lead.next_followup)}
        </p>
      )}
    </div>
  );
}
