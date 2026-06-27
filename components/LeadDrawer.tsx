"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, ActivityType } from "@/lib/types";
import { STAGES, STAGE_LABELS, stageLabel, type Stage } from "@/lib/stages";
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
  };
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

  // Change stage directly + log an activity. Used by the dropdown and the
  // two quick-action buttons.
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
    if (!confirm("Delete this lead and its activity? This cannot be undone."))
      return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }
    onDeleted(lead.id);
  }

  const title = lead.company_name || lead.contact_name || lead.email;

  return (
    <div className="fixed inset-0 z-30">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl sm:max-w-lg">
        <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            <p className="text-xs text-neutral-500">
              {stageLabel(lead.stage)} · source: {lead.source ?? "manual"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
          {/* Stage + quick actions */}
          <section className="mb-5">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Stage
            </label>
            <select
              value={lead.stage}
              disabled={busyStage}
              onChange={(e) => handleStageSelect(e.target.value as Stage)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:opacity-60"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  changeStage("sample_shipped", "sample_sent", "Sample sent")
                }
                disabled={busyStage}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
              >
                Mark Sample Sent
              </button>
              <button
                onClick={() =>
                  changeStage("feedback", "feedback", "Feedback received")
                }
                disabled={busyStage}
                className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-800 transition hover:bg-purple-100 disabled:opacity-60"
              >
                Mark Feedback Received
              </button>
            </div>
          </section>

          {/* Editable fields */}
          <section className="space-y-3">
            <Group label="Contact">
              <Input
                label="Contact name"
                value={form.contact_name}
                onChange={(v) => field("contact_name", v)}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => field("email", v)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => field("phone", v)}
                />
                <Input
                  label="WhatsApp"
                  value={form.whatsapp}
                  onChange={(v) => field("whatsapp", v)}
                />
              </div>
            </Group>

            <Group label="Company">
              <Input
                label="Company name"
                value={form.company_name}
                onChange={(v) => field("company_name", v)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="VAT number"
                  value={form.vat_number}
                  onChange={(v) => field("vat_number", v)}
                />
                <Input
                  label="Brand"
                  value={form.brand}
                  onChange={(v) => field("brand", v)}
                />
              </div>
            </Group>

            <Group label="Shipping">
              <Input
                label="Address line 1"
                value={form.ship_line1}
                onChange={(v) => field("ship_line1", v)}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="City"
                  value={form.ship_city}
                  onChange={(v) => field("ship_city", v)}
                />
                <Input
                  label="Postcode"
                  value={form.ship_postcode}
                  onChange={(v) => field("ship_postcode", v)}
                />
                <Input
                  label="Country"
                  value={form.ship_country}
                  onChange={(v) => field("ship_country", v)}
                />
              </div>
            </Group>

            <Group label="Pipeline details">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Requested products
                </label>
                <textarea
                  rows={3}
                  value={form.requested_products}
                  onChange={(e) => field("requested_products", e.target.value)}
                  className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>
              <Input
                label="Next follow-up"
                type="date"
                value={form.next_followup}
                onChange={(v) => field("next_followup", v)}
              />
            </Group>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              {message && (
                <span className="text-sm text-neutral-500">{message}</span>
              )}
            </div>
          </section>

          {/* Activity timeline */}
          <section className="mt-7 border-t border-neutral-200 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700">
              Activity
            </h3>
            <ActivityTimeline
              leadId={lead.id}
              userId={userId}
              refreshKey={refreshKey}
            />
          </section>

          <div className="mt-8 border-t border-neutral-200 pt-4">
            <button
              onClick={handleDelete}
              className="text-sm text-red-600 transition hover:text-red-700"
            >
              Delete lead
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
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
      <label className="mb-1 block text-xs font-medium text-neutral-600">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
    </div>
  );
}
