import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types";
import { isOverdue } from "@/lib/design";
import { isTerminal } from "@/lib/stages";

// Shared server-side loader for the authenticated CRM pages: enforces auth,
// fetches the shared lead list, and computes the sidebar badge counts.
export async function loadCrm(): Promise<{
  userId: string;
  userEmail: string;
  leads: Lead[];
  leadsCount: number;
  overdueCount: number;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as Lead[];
  const overdueCount = leads.filter(
    (l) => isOverdue(l.next_followup) && !isTerminal(l.stage)
  ).length;

  return {
    userId: user.id,
    userEmail: user.email ?? "Signed in",
    leads,
    leadsCount: leads.length,
    overdueCount,
  };
}
