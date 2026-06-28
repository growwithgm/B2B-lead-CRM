"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Lead } from "@/lib/types";
import {
  initials,
  colorFor,
  qualityStyle,
  qualityLabel,
  scoreStyle,
  leadDisplayName,
  isOverdue,
  relTime,
  truncate,
} from "@/lib/design";

export default function LeadCard({
  lead,
  onOpen,
}: {
  lead: Lead;
  onOpen: (lead: Lead) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  const name = leadDisplayName(lead);
  const q = qualityStyle(lead.lead_quality);
  const sc = scoreStyle(lead.lead_score);
  const overdue = isOverdue(lead.next_followup) && lead.stage !== "won" && lead.stage !== "lost";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(lead)}
      className="flex cursor-grab touch-none flex-col gap-2.5 rounded-[12px] border border-line bg-white p-3 shadow-card transition hover:border-[#D7D7CD] hover:shadow-cardHover active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {lead.lead_quality && (
            <span
              className="rounded-full px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-wide"
              style={{ background: q.bg, color: q.color }}
            >
              {qualityLabel(lead.lead_quality)}
            </span>
          )}
          {overdue && (
            <span className="rounded-full bg-[#FBE9E8] px-1.5 py-[3px] text-[10px] font-extrabold uppercase tracking-wide text-[#C5362F]">
              Overdue
            </span>
          )}
        </div>
        {lead.lead_score != null && lead.lead_score > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-[5px] w-6 overflow-hidden rounded-full bg-[#EFEFE9]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, lead.lead_score)}%`, background: sc.color }}
              />
            </div>
            <span className="font-mono text-[12px] font-semibold" style={{ color: sc.color }}>
              {lead.lead_score}
            </span>
          </div>
        )}
      </div>

      <div>
        <div className="text-[14px] font-bold leading-tight text-ink">{name}</div>
        {lead.company_name && lead.company_name !== name && (
          <div className="text-[12.5px] font-semibold text-muted-soft">{lead.company_name}</div>
        )}
      </div>

      {lead.requested_products && (
        <p className="text-[11.5px] leading-snug text-muted">{truncate(lead.requested_products, 80)}</p>
      )}

      {(lead.ship_city || lead.business_type) && (
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
          {lead.ship_city && <span>{lead.ship_city}</span>}
          {lead.ship_city && lead.business_type && (
            <span className="h-[3px] w-[3px] rounded-full bg-[#CFD2C8]" />
          )}
          {lead.business_type && <span>{lead.business_type}</span>}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[#F1F1EB] pt-2.5">
        <div className="flex items-center gap-1.5">
          {lead.owner_name ? (
            <>
              <span
                className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: colorFor(lead.owner_name) }}
              >
                {initials(lead.owner_name)}
              </span>
              <span className="text-[11px] text-muted-soft">{lead.owner_name}</span>
            </>
          ) : (
            <span className="text-[11px] text-muted">Unassigned</span>
          )}
        </div>
        <span className="text-[11px] text-muted">{relTime(lead.last_contact_at ?? lead.updated_at)}</span>
      </div>
    </div>
  );
}
