"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, ActivityType, LeadQuality } from "@/lib/types";
import { STAGES, STAGE_LABELS, stageLabel, stageMeta, stageIndex, type Stage } from "@/lib/stages";
import {
  cx,
  initials,
  colorFor,
  qualityStyle,
  qualityLabel,
  scoreStyle,
  leadDisplayName,
  leadTitle,
  formatDate,
  toE164,
} from "@/lib/design";
import { IconClose, IconCheck, IconWhatsApp, IconShopping, IconStar } from "./shell/icons";
import ActivityTimeline from "./ActivityTimeline";

type FormState = {
  contact_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  company_name: string;
  vat_number: string;
  ship_line1: string;
  ship_city: string;
  ship_postcode: string;
  ship_country: string;
  brand: string;
  requested_products: string;
  next_followup: string;
  business_type: string;
  language: string;
  website: string;
  instagram: string;
  next_action: string;
  lead_quality: string;
  lead_score: string;
  est_monthly_value: string;
};

function toForm(lead: Lead): FormState {
  return {
    contact_name: lead.contact_name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    whatsapp: lead.whatsapp ?? "",
    company_name: lead.company_name ?? "",
    vat_number: lead.vat_number ?? "",
    ship_line1: lead.ship_line1 ?? "",
    ship_city: lead.ship_city ?? "",
    ship_postcode: lead.ship_postcode ?? "",
    ship_country: lead.ship_country ?? "",
    brand: lead.brand ?? "",
    requested_products: lead.requested_products ?? "",
    next_followup: lead.next_followup ?? "",
    business_type: lead.business_type ?? "",
    language: lead.language ?? "",
    website: lead.website ?? "",
    instagram: lead.instagram ?? "",
    next_action: lead.next_action ?? "",
    lead_quality: lead.lead_quality ?? "",
    lead_score: lead.lead_score != null ? String(lead.lead_score) : "",
    est_monthly_value:
      lead.est_monthly_value != null ? String(lead.est_monthly_value) : "",
  };
}

function waTemplates(lead: Lead): { id: string; label: string; body: string }[] {
  const name = lead.contact_name?.split(" ")[0] || "there";
  const company = lead.company_name || "your business";
  return [
    {
      id: "intro",
      label: "Intro / first contact",
      body: `Hi ${name}! This is GROW NEST. Thanks for your interest in our products for ${company}. Would you like us to send you a sample pack to try?`,
    },
    {
      id: "sample",
      label: "Sample follow-up",
      body: `Hi ${name}, just checking in — did your GROW NEST samples arrive? We'd love to hear what you and your clients think.`,
    },
    {
      id: "offer",
      label: "B2B offer",
      body: `Hi ${name}! Based on your feedback we'd love to set up a wholesale account for ${company}. Can I send over our B2B price list?`,
    },
  ];
}

export default function LeadDrawer({
  lead,
  userId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  lead: Lead;
  userId: string;
  onClose: () => void;
  onUpdated: (lead: Lead) => void;
  onDeleted: (id: string) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [form, setForm] = useState<FormState>(() => toForm(lead));
  const [saving, setSaving] = useState(false);
  const [busyStage, setBusyStage] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<"details" | "activity">("details");

  // WhatsApp composer
  const templates = useMemo(() => waTemplates(lead), [lead]);
  const [waOpen, setWaOpen] = useState(false);
  const [waBody, setWaBody] = useState(templates[0].body);
  const [waSending, setWaSending] = useState(false);

  // Shopify
  const [shopBusy, setShopBusy] = useState(false);

  const meta = stageMeta(lead.stage);
  const q = qualityStyle(lead.lead_quality);
  const sc = scoreStyle(lead.lead_score);
  const idx = stageIndex(lead.stage);
  const waNumber = toE164(lead.whatsapp || lead.phone);

  function field<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const payload = {
      contact_name: form.contact_name || null,
      email: form.email,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      company_name: form.company_name || null,
      vat_number: form.vat_number || null,
      ship_line1: form.ship_line1 || null,
      ship_city: form.ship_city || null,
      ship_postcode: form.ship_postcode || null,
      ship_country: form.ship_country || null,
      brand: form.brand || null,
      requested_products: form.requested_products || null,
      next_followup: form.next_followup || null,
      business_type: form.business_type || null,
      language: form.language || null,
      website: form.website || null,
      instagram: form.instagram || null,
      next_action: form.next_action || null,
      lead_quality: (form.lead_quality || null) as LeadQuality | null,
      lead_score: form.lead_score ? Number(form.lead_score) : null,
      est_monthly_value: form.est_monthly_value ? Number(form.est_monthly_value) : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", lead.id)
      .select()
      .single();

    setSaving(false);
    if (error) {
      setMessage(`Save failed: ${error.message}`);
      return;
    }
    if (data) onUpdated(data as Lead);
    setMessage("Saved.");
  }

  // Change stage + log an activity. Used by dropdown + quick buttons.
  async function changeStage(
    newStage: Stage,
    activityType: ActivityType,
    content: string
  ) {
    if (busyStage) return;
    setBusyStage(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("leads")
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq("id", lead.id)
      .select()
      .single();

    if (error) {
      setBusyStage(false);
      setMessage(`Update failed: ${error.message}`);
      return;
    }

    await supabase.from("activities").insert({
      lead_id: lead.id,
      type: activityType,
      content,
      created_by: userId,
    });

    if (data) onUpdated(data as Lead);
    setRefreshKey((k) => k + 1);
    setBusyStage(false);
  }

  function handleStageSelect(newStage: Stage) {
    if (newStage === lead.stage) return;
    changeStage(
      newStage,
      "stage_change",
      `Moved: ${stageLabel(lead.stage)} → ${stageLabel(newStage)}`
    );
  }

  async function handleDelete() {
    if (!confirm("Delete this lead and its activity? This cannot be undone.")) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }
    onDeleted(lead.id);
  }

  async function sendWhatsApp() {
    if (!waBody.trim()) return;
    setWaSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, message: waBody.trim() }),
      });
      const json = await res.json();
      if (json.notConfigured) {
        setMessage("WhatsApp API not configured yet (set the env vars).");
      } else if (json.ok) {
        setMessage("WhatsApp message sent.");
        setWaOpen(false);
      } else {
        setMessage(`WhatsApp failed: ${json.error ?? "error"}`);
      }
    } catch (e) {
      setMessage(`WhatsApp failed: ${e instanceof Error ? e.message : "network error"}`);
    }
    setWaSending(false);
    setRefreshKey((k) => k + 1);
  }

  async function shopifyCreate() {
    setShopBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shopify/create-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const json = await res.json();
      if (json.notConfigured) {
        setMessage("Shopify not configured yet (set the env vars).");
      } else if (json.ok) {
        setMessage(json.created ? "Shopify customer created." : "Existing Shopify customer linked.");
        onUpdated({ ...lead, shopify_customer_id: json.customerId });
      } else {
        setMessage(`Shopify failed: ${json.error ?? "error"}`);
      }
    } catch (e) {
      setMessage(`Shopify failed: ${e instanceof Error ? e.message : "network error"}`);
    }
    setShopBusy(false);
    setRefreshKey((k) => k + 1);
  }

  async function shopifySync() {
    setShopBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shopify/sync-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const json = await res.json();
      if (json.notConfigured) {
        setMessage("Shopify not configured yet (set the env vars).");
      } else if (json.ok) {
        onUpdated({
          ...lead,
          last_order_total: json.totalSpent ?? lead.last_order_total,
          last_order_at: json.lastOrderAt ?? lead.last_order_at,
        });
        if (json.canMarkWon && lead.stage !== "won") {
          if (confirm(`This customer has ${json.paidCount} paid order(s). Mark lead as Won?`)) {
            await changeStage("won", "stage_change", "Marked Won — paid Shopify order found");
          } else {
            setMessage(`Synced: ${json.orderCount} order(s), total ${json.totalSpent}.`);
          }
        } else {
          setMessage(`Synced: ${json.orderCount} order(s), total ${json.totalSpent}.`);
        }
      } else {
        setMessage(`Sync failed: ${json.error ?? "error"}`);
      }
    } catch (e) {
      setMessage(`Sync failed: ${e instanceof Error ? e.message : "network error"}`);
    }
    setShopBusy(false);
    setRefreshKey((k) => k + 1);
  }

  const title = leadDisplayName(lead);
  const subtitle = lead.company_name && lead.company_name !== title ? lead.company_name : leadTitle(lead);

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[548px] animate-slide flex-col bg-[#F6F6F3] shadow-drawer">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-line bg-white px-[22px] py-[18px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
                style={{ background: q.bg, color: q.color }}
              >
                {initials(title)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[18px] font-extrabold tracking-tight text-ink">
                  {title}
                </div>
                <div className="truncate text-[13px] font-semibold text-muted-soft">{subtitle}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px] border border-line bg-white text-muted-soft transition hover:bg-[#F4F4EF]"
              aria-label="Close"
            >
              <IconClose size={17} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {lead.lead_quality && (
              <span
                className="rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide"
                style={{ background: q.bg, color: q.color }}
              >
                {qualityLabel(lead.lead_quality)}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
              style={{ background: meta.bg, color: meta.text }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
              {stageLabel(lead.stage)}
            </span>
            {lead.lead_score != null && lead.lead_score > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                style={{ background: sc.bg, color: sc.color }}
              >
                Score {lead.lead_score}
              </span>
            )}
            {lead.owner_name && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-soft">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: colorFor(lead.owner_name) }}
                >
                  {initials(lead.owner_name)}
                </span>
                {lead.owner_name}
              </span>
            )}
          </div>

          {/* Stage progress */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Stage {idx + 1} of {STAGES.length}
              </span>
              <span className="text-[12px] font-bold text-brand-deep">
                {stageLabel(lead.stage)}
              </span>
            </div>
            <div className="flex gap-1">
              {STAGES.map((s, i) => (
                <div
                  key={s}
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    background:
                      lead.stage === "lost"
                        ? "#EAEAE3"
                        : i < idx
                        ? "#6FBE9C"
                        : i === idx
                        ? "#0E7B57"
                        : "#EAEAE3",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0 border-b border-line bg-white">
          {(["details", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cx(
                "flex-1 border-b-2 py-3 text-[13px] font-bold transition",
                tab === t
                  ? "border-brand text-brand-deep"
                  : "border-transparent text-muted"
              )}
            >
              {t === "details" ? "Details" : "Activity timeline"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="scrollbar-thin flex-1 overflow-y-auto px-[22px] py-[18px]">
          {tab === "details" ? (
            <>
              {/* Quick actions */}
              <Section title="Stage & actions">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
                  Stage
                </label>
                <select
                  value={lead.stage}
                  disabled={busyStage}
                  onChange={(e) => handleStageSelect(e.target.value as Stage)}
                  className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm focus:border-brand disabled:opacity-60"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => changeStage("sample_shipped", "sample_sent", "Sample sent")}
                    disabled={busyStage}
                    className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
                  >
                    Mark Sample Sent
                  </button>
                  <button
                    onClick={() => changeStage("feedback", "feedback", "Feedback received")}
                    disabled={busyStage}
                    className="rounded-[10px] border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-800 transition hover:bg-purple-100 disabled:opacity-60"
                  >
                    Mark Feedback Received
                  </button>
                  <button
                    onClick={() => {
                      setWaBody(templates[0].body);
                      setWaOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#BBE3CC] bg-[#E3F3EA] px-3 py-1.5 text-sm font-semibold text-[#1F8A5B] transition hover:bg-[#D5ECdf]"
                  >
                    <IconWhatsApp size={15} /> Send WhatsApp
                  </button>
                </div>
              </Section>

              {/* WhatsApp composer */}
              {waOpen && (
                <div className="mb-3.5 animate-pop rounded-[14px] border border-[#BBE3CC] bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-extrabold text-ink">Send WhatsApp</span>
                    <button
                      onClick={() => setWaOpen(false)}
                      className="text-muted hover:text-muted-strong"
                      aria-label="Close composer"
                    >
                      <IconClose size={15} />
                    </button>
                  </div>
                  <p className="mb-2 text-[12px] text-muted">
                    To{" "}
                    <span className="font-mono font-semibold text-muted-strong">
                      {waNumber ?? "— no number on file"}
                    </span>
                  </p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setWaBody(t.body)}
                        className="rounded-md border border-line bg-[#F6F6F2] px-2 py-1 text-[11.5px] font-semibold text-muted-soft transition hover:bg-neutral-100"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={waBody}
                    onChange={(e) => setWaBody(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-[10px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/15"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setWaOpen(false)}
                      className="rounded-[9px] border border-line bg-white px-3 py-1.5 text-sm font-semibold text-muted-soft hover:bg-[#F4F4EF]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendWhatsApp}
                      disabled={waSending || !waBody.trim() || !waNumber}
                      className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#1F8A5B] px-3.5 py-1.5 text-sm font-bold text-white transition hover:bg-[#187048] disabled:opacity-50"
                    >
                      <IconWhatsApp size={15} /> {waSending ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              )}

              {/* Shopify B2B */}
              <Section title="Shopify B2B account" accent="#6C53C7">
                {lead.shopify_customer_id ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Detail label="Customer ID" mono value={lead.shopify_customer_id} span />
                    <Detail
                      label="Last order total"
                      value={lead.last_order_total != null ? `€${lead.last_order_total}` : "—"}
                    />
                    <Detail label="Last order" value={formatDate(lead.last_order_at)} />
                  </div>
                ) : (
                  <EmptyNote text="No Shopify customer linked yet." />
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={shopifyCreate}
                    disabled={shopBusy}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D6CEF0] bg-[#ECE9F7] px-3 py-1.5 text-sm font-semibold text-[#574099] transition hover:bg-[#E2DDF3] disabled:opacity-60"
                  >
                    <IconShopping size={15} />
                    {lead.shopify_customer_id ? "Re-link customer" : "Create in Shopify"}
                  </button>
                  <button
                    onClick={shopifySync}
                    disabled={shopBusy || !lead.shopify_customer_id}
                    className="rounded-[10px] border border-line bg-white px-3 py-1.5 text-sm font-semibold text-muted-soft transition hover:bg-[#F4F4EF] disabled:opacity-50"
                  >
                    Sync orders
                  </button>
                </div>
              </Section>

              {/* Editable details */}
              <Section title="Lead details">
                <div className="space-y-3">
                  <Group label="Contact">
                    <Input label="Contact name" value={form.contact_name} onChange={(v) => field("contact_name", v)} />
                    <Input label="Email" type="email" value={form.email} onChange={(v) => field("email", v)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Phone" value={form.phone} onChange={(v) => field("phone", v)} />
                      <Input label="WhatsApp" value={form.whatsapp} onChange={(v) => field("whatsapp", v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Language" value={form.language} onChange={(v) => field("language", v)} />
                      <Input label="Business type" value={form.business_type} onChange={(v) => field("business_type", v)} />
                    </div>
                  </Group>

                  <Group label="Company">
                    <Input label="Company name" value={form.company_name} onChange={(v) => field("company_name", v)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="VAT number" value={form.vat_number} onChange={(v) => field("vat_number", v)} />
                      <Input label="Brand" value={form.brand} onChange={(v) => field("brand", v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Website" value={form.website} onChange={(v) => field("website", v)} />
                      <Input label="Instagram" value={form.instagram} onChange={(v) => field("instagram", v)} />
                    </div>
                  </Group>

                  <Group label="Shipping">
                    <Input label="Address line 1" value={form.ship_line1} onChange={(v) => field("ship_line1", v)} />
                    <div className="grid grid-cols-3 gap-3">
                      <Input label="City" value={form.ship_city} onChange={(v) => field("ship_city", v)} />
                      <Input label="Postcode" value={form.ship_postcode} onChange={(v) => field("ship_postcode", v)} />
                      <Input label="Country" value={form.ship_country} onChange={(v) => field("ship_country", v)} />
                    </div>
                  </Group>

                  <Group label="Qualification & pipeline">
                    <div className="grid grid-cols-3 gap-3">
                      <Select
                        label="Quality"
                        value={form.lead_quality}
                        onChange={(v) => field("lead_quality", v)}
                        options={[
                          { value: "", label: "—" },
                          { value: "hot", label: "Hot" },
                          { value: "warm", label: "Warm" },
                          { value: "cold", label: "Cold" },
                        ]}
                      />
                      <Input label="Score" type="number" value={form.lead_score} onChange={(v) => field("lead_score", v)} />
                      <Input label="Monthly €" type="number" value={form.est_monthly_value} onChange={(v) => field("est_monthly_value", v)} />
                    </div>
                    <Input label="Next action" value={form.next_action} onChange={(v) => field("next_action", v)} />
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-soft">
                        Requested products
                      </label>
                      <textarea
                        rows={3}
                        value={form.requested_products}
                        onChange={(e) => field("requested_products", e.target.value)}
                        className="w-full resize-none rounded-[10px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/15"
                      />
                    </div>
                    <Input label="Next follow-up" type="date" value={form.next_followup} onChange={(v) => field("next_followup", v)} />
                  </Group>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-[10px] bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-[#26302A] disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    {message && <span className="text-sm text-muted-soft">{message}</span>}
                  </div>
                </div>
              </Section>

              {/* Feedback (read) */}
              {lead.feedback_rating != null && lead.feedback_rating > 0 && (
                <Section title="Feedback" accent="#E8A93B">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <IconStar key={n} size={16} filled={n <= (lead.feedback_rating ?? 0)} />
                      ))}
                    </div>
                    <span className="font-mono text-[13px] font-semibold text-[#26302A]">
                      {lead.feedback_rating}.0
                    </span>
                  </div>
                  {lead.feedback_comment && (
                    <p className="rounded-[10px] border border-[#F0F0E9] bg-[#FBFBF8] px-3.5 py-3 text-[13px] italic leading-relaxed text-muted-strong">
                      {lead.feedback_comment}
                    </p>
                  )}
                  {lead.feedback_favorite && (
                    <p className="mt-2 text-[13px] text-muted-soft">
                      Favorite: <span className="font-semibold text-brand-deep">{lead.feedback_favorite}</span>
                    </p>
                  )}
                </Section>
              )}

              <div className="mt-2 border-t border-line pt-4">
                <button
                  onClick={handleDelete}
                  className="text-sm font-semibold text-red-600 transition hover:text-red-700"
                >
                  Delete lead
                </button>
              </div>
            </>
          ) : (
            <ActivityTimeline leadId={lead.id} userId={userId} refreshKey={refreshKey} />
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 gap-2.5 border-t border-line bg-white px-[22px] py-3.5">
          <button
            onClick={() => {
              setTab("details");
              setWaBody(templates[0].body);
              setWaOpen(true);
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-brand py-2.5 text-[13.5px] font-bold text-white shadow-[0_2px_6px_rgba(14,123,87,.28)] transition hover:bg-brand-dark"
          >
            <IconWhatsApp size={16} /> Message lead
          </button>
          <button
            onClick={onClose}
            className="rounded-[10px] border border-line bg-white px-[18px] py-2.5 text-[13.5px] font-bold text-muted-soft transition hover:bg-[#F4F4EF]"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ---- small presentational helpers ---- */

function Section({
  title,
  accent = "#0E7B57",
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 rounded-[14px] border border-line bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <span className="text-[13.5px] font-extrabold text-ink">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  span,
}: {
  label: string;
  value: string;
  mono?: boolean;
  span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#A6AB9E]">
        {label}
      </div>
      <div className={cx("text-[13px] font-semibold text-[#26302A]", mono && "break-all font-mono text-[12.5px]")}>
        {value}
      </div>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border border-dashed border-[#E2E2DA] bg-[#FBFBF8] px-3.5 py-3 text-[12.5px] font-medium text-muted">
      {text}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-line p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-soft">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-soft">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm focus:border-brand"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
