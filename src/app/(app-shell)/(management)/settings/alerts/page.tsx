import { requirePageAuth } from '@/lib/auth/page-guard';
import { AlertsSettingsClient } from '@/components/features/settings/alerts/alerts-settings-client';

export default async function AlertsPage() {
  await requirePageAuth(
    (role) => role === 'GlobalAdmin' || role === 'ITOperator'
  );

  return <AlertsSettingsClient />;
}
