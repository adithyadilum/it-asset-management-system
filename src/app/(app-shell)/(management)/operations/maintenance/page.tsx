import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { MaintenanceShell } from '@/components/features/maintenance/maintenance-shell';
import { MaintenanceErrorBoundary } from '@/components/features/maintenance/maintenance-error-boundary';
import { requirePageAuth } from '@/lib/auth/page-guard';

/**
 * No instant shell is possible here: the `(app-shell)` layout above blocks on
 * `connection()` to read the session, so nothing on this route can be
 * prerendered. Without this Next reports "Could not validate `instant`" on
 * every visit — the layout's config does not cascade to pages.
 */
export const instant = false;

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
