import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { requirePageAuth } from '@/lib/auth/page-guard';
import { AlertsSettingsClient } from '@/components/features/settings/alerts/alerts-settings-client';
import { getAlertsSettingsBootstrap } from '@/actions/notifications';

async function AlertsPageContent() {
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

/**
 * Streams rather than blocks.
 *
 * The body above reads the session and queries the database, none of
 * which can be prerendered. Keeping the default export synchronous lets
 * this route paint its chrome immediately and fill in the content when
 * the data arrives, instead of the navigation waiting on the slowest
 * query.
 */
export default function AlertsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AlertsPageContent />
    </Suspense>
  );
}
