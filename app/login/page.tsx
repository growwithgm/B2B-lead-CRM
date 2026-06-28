"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconLogo } from "@/components/shell/icons";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#12936A] to-[#0A5A40] shadow-[0_3px_10px_rgba(14,123,87,.34)]">
            <IconLogo size={24} />
          </div>
          <h1 className="text-[24px] font-extrabold tracking-tight text-ink">GROW NEST</h1>
          <p className="mt-1 text-sm text-muted">B2B Lead CRM</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[20px] border border-line bg-white p-6 shadow-card"
        >
          <div>
            <label className="mb-1 block text-sm font-semibold text-muted-strong">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm text-[#26302A] focus:border-brand focus:ring-2 focus:ring-brand/15"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-muted-strong">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm text-[#26302A] focus:border-brand focus:ring-2 focus:ring-brand/15"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[10px] bg-brand px-3 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-xs text-muted">Accounts are created by invite in Supabase.</p>
        </form>
      </div>
    </main>
  );
}
