import AppShell from "@/components/shell/AppShell";
import FeedbackView from "@/components/views/FeedbackView";
import { loadCrm } from "@/lib/pageData";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const { userId, userEmail, leads, leadsCount, overdueCount } = await loadCrm();
  return (
    <AppShell
      active="feedback"
      title="Feedback"
      subtitle="Product feedback from sampled leads"
      userEmail={userEmail}
      leadsCount={leadsCount}
      overdueCount={overdueCount}
    >
      <FeedbackView initialLeads={leads} userId={userId} />
    </AppShell>
  );
}
