import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { MaintenanceShell } from '@/components/features/maintenance/maintenance-shell';
import { MaintenanceErrorBoundary } from '@/components/features/maintenance/maintenance-error-boundary';
import { requirePageAuth } from '@/lib/auth/page-guard';

async function MaintenanceAndRepairsPageContent() {
  const user = await requirePageAuth();

  return (
    <MaintenanceErrorBoundary>
      <MaintenanceShell userRole={user.role} />
    </MaintenanceErrorBoundary>
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
export default function MaintenanceAndRepairsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MaintenanceAndRepairsPageContent />
    </Suspense>
  );
}
