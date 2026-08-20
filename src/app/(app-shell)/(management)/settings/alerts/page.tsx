import { requirePageAuth } from '@/lib/auth/page-guard';
import { AlertsSettingsClient } from '@/components/features/settings/alerts/alerts-settings-client';
import { getAlertsSettingsBootstrap } from '@/actions/notifications';

export default async function AlertsPage() {
  await requirePageAuth(
    (role) => role === 'GlobalAdmin' || role === 'ITOperator'
  );
  const bootstrap = await getAlertsSettingsBootstrap();

  return (
    <AlertsSettingsClient
      initialRules={bootstrap.rules}
      initialIntegrations={bootstrap.integrations}
      initialIsAdmin={bootstrap.isAdmin}
    />
  );
}
