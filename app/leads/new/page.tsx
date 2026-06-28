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
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-extrabold tracking-tight text-ink">Add lead</h1>
          <Link
            href="/leads"
            className="text-sm font-semibold text-muted transition hover:text-muted-strong"
          >
            ← Back to leads
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <AddLeadForm userId={user.id} />
      </div>
    </main>
  );
}
