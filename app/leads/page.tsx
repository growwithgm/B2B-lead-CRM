import AppShell from "@/components/shell/AppShell";
import LeadsTableView from "@/components/views/LeadsTableView";
import { loadCrm } from "@/lib/pageData";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { userId, userEmail, leads, leadsCount, overdueCount } = await loadCrm();
  return (
    <AppShell
      active="leads"
      title="Leads"
      subtitle="Every lead from Klaviyo and other sources"
      userEmail={userEmail}
      leadsCount={leadsCount}
      overdueCount={overdueCount}
    >
      <LeadsTableView
        initialLeads={leads}
        userId={userId}
        initialSearch={searchParams.q ?? ""}
      />
    </AppShell>
  );
}
