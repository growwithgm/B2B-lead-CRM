import AppShell from "@/components/shell/AppShell";
import PipelineView from "@/components/views/PipelineView";
import { loadCrm } from "@/lib/pageData";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const { userId, userEmail, leads, leadsCount, overdueCount } = await loadCrm();
  return (
    <AppShell
      active="pipeline"
      title="Pipeline"
      subtitle="Drag leads across stages to update them"
      userEmail={userEmail}
      leadsCount={leadsCount}
      overdueCount={overdueCount}
    >
      <PipelineView initialLeads={leads} userId={userId} />
    </AppShell>
  );
}
