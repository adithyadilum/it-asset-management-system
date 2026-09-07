import { PageSkeleton } from '@/components/shared/page-skeleton';
import { requirePageAuth } from '@/lib/auth/page-guard';
import { canManageAssets } from '@/lib/auth/roles';
import { Suspense } from 'react';
import { AdminMobileScannerButton } from '@/components/features/mobile/admin-mobile-scanner-button';
import { AdminMobileMetrics } from '@/components/features/mobile/admin-mobile-metrics';
import { AdminMobileMetricsSkeleton } from '@/components/features/mobile/admin-mobile-metrics-skeleton';

/**
 * No instant shell is possible here: the `(app-shell)` layout above blocks on
 * `connection()` to read the session, so nothing on this route can be
 * prerendered. Without this Next reports "Could not validate `instant`" on
 * every visit — the layout's config does not cascade to pages.
 */
export const instant = false;

async function MobilePageContent() {
  await requirePageAuth(canManageAssets);

  return (
    <div className="flex w-full flex-col h-full bg-background md:hidden">
      <div className="flex flex-col gap-6 p-4 pb-32 md:hidden bg-white min-h-screen font-sans">
        <AdminMobileScannerButton />

        <Suspense fallback={<AdminMobileMetricsSkeleton />}>
          <AdminMobileMetrics />
        </Suspense>
      </div>
    </div>
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
export default function MobilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MobilePageContent />
    </Suspense>
  );
}
