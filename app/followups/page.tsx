import AppShell from "@/components/shell/AppShell";
import FollowupsView from "@/components/views/FollowupsView";
import { loadCrm } from "@/lib/pageData";

export const dynamic = "force-dynamic";

export default async function FollowupsPage() {
  const { userId, userEmail, leads, leadsCount, overdueCount } = await loadCrm();
  return (
    <AppShell
      active="followups"
      title="Follow-ups"
      subtitle="Tasks and overdue actions"
      userEmail={userEmail}
      leadsCount={leadsCount}
      overdueCount={overdueCount}
    >
      <FollowupsView initialLeads={leads} userId={userId} />
    </AppShell>
  );
}
