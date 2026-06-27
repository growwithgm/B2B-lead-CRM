import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddLeadForm from "@/components/AddLeadForm";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">Add lead</h1>
          <Link
            href="/"
            className="text-sm text-neutral-500 transition hover:text-neutral-800"
          >
            ← Back to board
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <AddLeadForm userId={user.id} />
      </div>
    </main>
  );
}
