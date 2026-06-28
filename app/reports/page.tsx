import AppShell from "@/components/shell/AppShell";
import ReportsView from "@/components/views/ReportsView";
import { loadCrm } from "@/lib/pageData";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { userEmail, leads, leadsCount, overdueCount } = await loadCrm();
  return (
    <AppShell
      active="reports"
      title="Reports"
      subtitle="Performance and funnel analytics"
      userEmail={userEmail}
      leadsCount={leadsCount}
      overdueCount={overdueCount}
    >
      <ReportsView leads={leads} />
    </AppShell>
  );
}
