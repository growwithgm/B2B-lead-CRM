"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EMPTY = {
  contact_name: "",
  email: "",
  phone: "",
  whatsapp: "",
  company_name: "",
  vat_number: "",
  ship_line1: "",
  ship_city: "",
  ship_postcode: "",
  ship_country: "ES",
  brand: "",
  business_type: "",
  language: "",
  website: "",
  instagram: "",
  owner_name: "",
  lead_quality: "",
  requested_products: "",
  next_followup: "",
};

export default function AddLeadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("leads")
      .insert({
        contact_name: form.contact_name || null,
        email: form.email.trim().toLowerCase(),
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        company_name: form.company_name || null,
        vat_number: form.vat_number || null,
        ship_line1: form.ship_line1 || null,
        ship_city: form.ship_city || null,
        ship_postcode: form.ship_postcode || null,
        ship_country: form.ship_country || null,
        brand: form.brand || null,
        business_type: form.business_type || null,
        language: form.language || null,
        website: form.website || null,
        instagram: form.instagram || null,
        owner_name: form.owner_name || null,
        lead_quality: form.lead_quality || null,
        requested_products: form.requested_products || null,
        next_followup: form.next_followup || null,
        stage: "new_lead",
        source: "manual",
        assigned_to: userId,
      })
      .select()
      .single();

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    if (data) {
      await supabase.from("activities").insert({
        lead_id: data.id,
        type: "note",
        content: "Lead added manually.",
        created_by: userId,
      });
    }

    router.push("/leads");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[20px] border border-line bg-white p-6 shadow-card"
    >
      <Field label="Email *" type="email" value={form.email} onChange={(v) => field("email", v)} required />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Contact name" value={form.contact_name} onChange={(v) => field("contact_name", v)} />
        <Field label="Company name" value={form.company_name} onChange={(v) => field("company_name", v)} />
        <Field label="Phone" value={form.phone} onChange={(v) => field("phone", v)} />
        <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => field("whatsapp", v)} />
        <Field label="Business type" value={form.business_type} onChange={(v) => field("business_type", v)} />
        <Field label="Language" value={form.language} onChange={(v) => field("language", v)} />
        <Field label="VAT number" value={form.vat_number} onChange={(v) => field("vat_number", v)} />
        <Field label="Brand" value={form.brand} onChange={(v) => field("brand", v)} />
        <Field label="Website" value={form.website} onChange={(v) => field("website", v)} />
        <Field label="Instagram" value={form.instagram} onChange={(v) => field("instagram", v)} />
        <Field label="Owner" value={form.owner_name} onChange={(v) => field("owner_name", v)} />
        <div>
          <label className="mb-1 block text-sm font-semibold text-muted-strong">Quality</label>
          <select
            value={form.lead_quality}
            onChange={(e) => field("lead_quality", e.target.value)}
            className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm focus:border-brand"
          >
            <option value="">—</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </div>
      </div>

      <Field label="Shipping address" value={form.ship_line1} onChange={(v) => field("ship_line1", v)} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="City" value={form.ship_city} onChange={(v) => field("ship_city", v)} />
        <Field label="Postcode" value={form.ship_postcode} onChange={(v) => field("ship_postcode", v)} />
        <Field label="Country" value={form.ship_country} onChange={(v) => field("ship_country", v)} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-muted-strong">Requested products</label>
        <textarea
          rows={3}
          value={form.requested_products}
          onChange={(e) => field("requested_products", e.target.value)}
          className="w-full resize-none rounded-[10px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
      </div>

      <Field label="Next follow-up" type="date" value={form.next_followup} onChange={(v) => field("next_followup", v)} />

      {error && (
        <p className="rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-[10px] bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Create lead"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/leads")}
          className="rounded-[10px] border border-line px-4 py-2 text-sm font-semibold text-muted-soft transition hover:bg-[#F4F4EF]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-muted-strong">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
    </div>
  );
}
