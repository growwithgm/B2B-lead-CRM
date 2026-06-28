import AppShell from "@/components/shell/AppShell";
import SamplesView from "@/components/views/SamplesView";
import { loadCrm } from "@/lib/pageData";

export const dynamic = "force-dynamic";

export default async function SamplesPage() {
  const { userId, userEmail, leads, leadsCount, overdueCount } = await loadCrm();
  return (
    <AppShell
      active="samples"
      title="Samples"
      subtitle="Track sample orders and shipping"
      userEmail={userEmail}
      leadsCount={leadsCount}
      overdueCount={overdueCount}
    >
      <SamplesView initialLeads={leads} userId={userId} />
    </AppShell>
  );
}
