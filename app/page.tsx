import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types";
import KanbanBoard from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">GROW NEST</h1>
            <p className="text-xs text-neutral-500">B2B Lead Pipeline</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/leads/new"
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              + Add lead
            </Link>
            <span className="hidden text-sm text-neutral-500 sm:inline">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <KanbanBoard
        initialLeads={(leads ?? []) as Lead[]}
        userId={user.id}
      />
    </main>
  );
}
