import AppShell from "@/components/shell/AppShell";
import SettingsView from "@/components/views/SettingsView";
import { loadCrm } from "@/lib/pageData";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { userEmail, leadsCount, overdueCount } = await loadCrm();
  return (
    <AppShell
      active="settings"
      title="Settings"
      subtitle="Workspace and team configuration"
      userEmail={userEmail}
      leadsCount={leadsCount}
      overdueCount={overdueCount}
    >
      <SettingsView userEmail={userEmail} />
    </AppShell>
  );
}
