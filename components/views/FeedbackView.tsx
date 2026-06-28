"use client";

import { useMemo } from "react";
import type { Lead } from "@/lib/types";
import { initials, qualityStyle, leadDisplayName, formatDate } from "@/lib/design";
import { IconStar } from "../shell/icons";
import { useLeads } from "./useLeads";
import LeadDrawer from "../LeadDrawer";

function interestStyle(v: string | null) {
  switch ((v ?? "").toLowerCase()) {
    case "yes":
      return { bg: "#E2F1EA", color: "#0A5A40", label: "Interested" };
    case "maybe":
      return { bg: "#FBF1DA", color: "#A66A09", label: "Maybe" };
    case "no":
      return { bg: "#FBEAE9", color: "#B0524C", label: "Not now" };
    default:
      return { bg: "#EFEFED", color: "#6B7268", label: "—" };
  }
}

export default function FeedbackView({
  initialLeads,
  userId,
}: {
  initialLeads: Lead[];
  userId: string;
}) {
  const { leads, selected, openLead, closeLead, applyUpdate, removeLead } =
    useLeads(initialLeads);

  const withFeedback = useMemo(
    () => leads.filter((l) => l.feedback_rating != null && l.feedback_rating > 0),
    [leads]
  );

  if (withFeedback.length === 0) {
    return (
      <div className="rounded-[16px] border border-line bg-white px-5 py-[54px] text-center shadow-card">
        <div className="text-[15px] font-bold text-[#26302A]">No feedback captured yet</div>
        <div className="mt-1 text-[13px] text-muted">Record a rating on a lead to see it here.</div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(390px,1fr))] gap-4">
        {withFeedback.map((l) => {
          const q = qualityStyle(l.lead_quality);
          const interest = interestStyle(l.feedback_interest);
          const rating = l.feedback_rating ?? 0;
          return (
            <button
              key={l.id}
              onClick={() => openLead(l)}
              className="flex flex-col gap-3.5 rounded-[16px] border border-line bg-white p-5 text-left shadow-card transition hover:border-[#D7D7CD] hover:shadow-cardHover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: q.bg, color: q.color }}>
                    {initials(leadDisplayName(l))}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-bold text-ink">{leadDisplayName(l)}</div>
                    <div className="truncate text-[12.5px] font-semibold text-muted-soft">{l.company_name ?? l.email}</div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <IconStar key={n} size={15} filled={n <= rating} />
                    ))}
                  </div>
                  <span className="font-mono text-[13px] font-semibold text-[#26302A]">{rating}.0</span>
                </div>
              </div>

              {l.feedback_comment && (
                <p className="rounded-[11px] border border-[#F0F0E9] bg-[#FBFBF8] px-3.5 py-3 text-[13px] italic leading-relaxed text-muted-strong">
                  {l.feedback_comment}
                </p>
              )}

              <div className="flex flex-wrap gap-4">
                {l.feedback_favorite && (
                  <div>
                    <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#A6AB9E]">Favorite product</div>
                    <div className="text-[12.5px] font-bold text-brand-deep">{l.feedback_favorite}</div>
                  </div>
                )}
                {l.requested_products && (
                  <div className="min-w-[120px] flex-1">
                    <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#A6AB9E]">Products tried</div>
                    <div className="text-[12.5px] font-semibold text-muted-strong">{l.requested_products}</div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#F1F1EB] pt-3">
                <span className="rounded-full px-2.5 py-1 text-[11.5px] font-bold" style={{ background: interest.bg, color: interest.color }}>
                  {interest.label} in B2B
                </span>
                {l.next_followup && (
                  <span className="text-[11.5px] text-muted">Follow-up {formatDate(l.next_followup)}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <LeadDrawer lead={selected} userId={userId} onClose={closeLead} onUpdated={applyUpdate} onDeleted={removeLead} />
      )}
    </>
  );
}
