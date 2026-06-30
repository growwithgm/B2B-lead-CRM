import type { Lead } from "@/lib/types";
import { PIPELINE_STAGES, STAGE_LABELS, stageMeta, isAtOrAfter } from "@/lib/stages";
import { initials, colorFor } from "@/lib/design";

// Pure server component — aggregate analytics derived from real lead data.
export default function ReportsView({ leads }: { leads: Lead[] }) {
  const total = leads.length;
  const active = leads.filter((l) => l.stage !== "lost");
  const newWeek = leads.filter(
    (l) => Date.now() - new Date(l.created_at).getTime() < 7 * 864e5
  ).length;
  const qualified = active.filter((l) => isAtOrAfter(l.stage, "company_created")).length;
  const samplesSent = active.filter((l) =>
    isAtOrAfter(l.stage, "sample_order_done")
  ).length;
  const feedbackCount = leads.filter((l) => l.feedback_rating != null && l.feedback_rating > 0).length;
  const won = leads.filter((l) => l.stage === "first_paid_order").length;
  const convRate = total ? (won / total) * 100 : 0;

  const repStats = [
    { label: "Leads this week", value: String(newWeek), sub: "new" },
    { label: "Accounts created", value: String(qualified), sub: "company created+" },
    { label: "Samples ordered", value: String(samplesSent), sub: "ordered+" },
    { label: "Feedback received", value: String(feedbackCount), sub: "responses" },
    { label: "Won", value: String(won), sub: "first paid order" },
    { label: "Conversion rate", value: `${convRate.toFixed(1)}%`, sub: "lead → won" },
  ];

  // Funnel by milestone
  const milestones = [
    { label: "Total leads", n: total },
    { label: "Accounts created", n: qualified },
    { label: "Samples ordered", n: samplesSent },
    { label: "Feedback", n: feedbackCount },
    { label: "Won", n: won },
  ];
  const fcolors = ["#94A187", "#2E8E8E", "#C77F1A", "#B5790A", "#0E7B57"];
  const funnel = milestones.map((m, i) => ({
    ...m,
    color: fcolors[i],
    pct: Math.max(7, Math.round((m.n / (total || 1)) * 100)),
    rate: i === 0 ? "100%" : `${milestones[i - 1].n ? Math.round((m.n / milestones[i - 1].n) * 100) : 0}% of prev`,
  }));

  // Stage distribution
  const counts: Record<string, number> = {};
  for (const s of PIPELINE_STAGES) counts[s] = 0;
  for (const l of leads) counts[l.stage] = (counts[l.stage] ?? 0) + 1;
  const stageMax = Math.max(1, ...PIPELINE_STAGES.map((s) => counts[s]));

  // Owner performance (by owner_name)
  const ownerMap = new Map<string, { leads: number; samples: number; won: number }>();
  for (const l of leads) {
    const key = l.owner_name || "Unassigned";
    const o = ownerMap.get(key) ?? { leads: 0, samples: 0, won: 0 };
    o.leads += 1;
    if (isAtOrAfter(l.stage, "sample_order_done") && l.stage !== "lost") o.samples += 1;
    if (l.stage === "first_paid_order") o.won += 1;
    ownerMap.set(key, o);
  }
  const owners = Array.from(ownerMap.entries())
    .map(([name, v]) => ({ name, ...v, pct: Math.round((v.leads / (total || 1)) * 100) }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 6);

  // Top product categories
  const cat = new Map<string, number>();
  for (const l of leads) for (const c of l.categories ?? []) cat.set(c, (cat.get(c) ?? 0) + 1);
  const topCats = Array.from(cat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const catMax = Math.max(1, ...topCats.map(([, n]) => n));

  return (
    <>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(168px,1fr))] gap-3.5">
        {repStats.map((s) => (
          <div key={s.label} className="rounded-[14px] border border-line bg-white p-4 shadow-card">
            <div className="mb-2 text-[12px] font-semibold text-muted-soft">{s.label}</div>
            <div className="text-[28px] font-extrabold leading-none tracking-tight text-ink">{s.value}</div>
            <div className="mt-1.5 text-[11.5px] text-muted">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="min-w-0 flex-[2_1_460px] rounded-[16px] border border-line bg-white p-5 shadow-card">
          <div className="text-[14.5px] font-extrabold tracking-tight text-ink">Lead-to-customer funnel</div>
          <div className="mt-px text-[12.5px] text-muted">How leads progress to won</div>
          <div className="mt-4 flex flex-col gap-2.5">
            {funnel.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-[126px] flex-shrink-0 text-[12.5px] font-semibold text-[#5C635A]">{f.label}</span>
                <div className="h-[30px] flex-1 overflow-hidden rounded-[8px] bg-[#F3F3EE]">
                  <div className="flex h-full items-center rounded-[8px] px-2.5 text-[12.5px] font-bold text-white" style={{ width: `${f.pct}%`, background: f.color, minWidth: 42 }}>
                    {f.n}
                  </div>
                </div>
                <span className="w-[96px] flex-shrink-0 text-right text-[11px] text-muted">{f.rate}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-[1_1_250px] rounded-[16px] border border-line bg-white p-5 shadow-card">
          <div className="text-[14.5px] font-extrabold tracking-tight text-ink">Stage distribution</div>
          <div className="mt-4 flex flex-col gap-2.5">
            {PIPELINE_STAGES.map((s) => {
              const meta = stageMeta(s);
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-[110px] flex-shrink-0 text-[12px] font-semibold text-[#5C635A]">{STAGE_LABELS[s]}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F3F3EE]">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((counts[s] / stageMax) * 100)}%`, background: meta.dot }} />
                  </div>
                  <span className="w-6 text-right font-mono text-[12.5px] font-semibold text-muted-strong">{counts[s]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-0 flex-[1_1_380px] rounded-[16px] border border-line bg-white p-5 shadow-card">
          <div className="text-[14.5px] font-extrabold tracking-tight text-ink">Top product categories</div>
          {topCats.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted">No category data yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {topCats.map(([name, n]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-[150px] flex-shrink-0 truncate text-[12.5px] font-semibold text-muted-strong">{name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F3F3EE]">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((n / catMax) * 100)}%` }} />
                  </div>
                  <span className="w-6 text-right font-mono text-[12.5px] font-semibold text-brand-deep">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-[1_1_380px] rounded-[16px] border border-line bg-white p-5 shadow-card">
          <div className="mb-1.5 text-[14.5px] font-extrabold tracking-tight text-ink">Owner performance</div>
          {owners.map((o) => (
            <div key={o.name} className="flex items-center gap-3 border-t border-[#F1F1EB] py-3">
              <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: colorFor(o.name) }}>
                {initials(o.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-[#26302A]">{o.name}</div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F3F3EE]">
                  <div className="h-full rounded-full" style={{ width: `${o.pct}%`, background: colorFor(o.name) }} />
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-3.5 text-center">
                <Stat n={o.leads} label="leads" />
                <Stat n={o.samples} label="samp." />
                <Stat n={o.won} label="won" highlight />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Stat({ n, label, highlight }: { n: number; label: string; highlight?: boolean }) {
  return (
    <div>
      <div className={`font-mono text-[14px] font-semibold ${highlight ? "text-brand-deep" : "text-[#26302A]"}`}>{n}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
