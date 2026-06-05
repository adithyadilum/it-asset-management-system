import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/actions/auth';
import { AlertsSettingsClient } from '@/components/features/settings/alerts/alerts-settings-client';

export default async function AlertsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator') {
    redirect('/403');
  }

  return <AlertsSettingsClient />;
}

