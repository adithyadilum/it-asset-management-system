import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { requirePageAuth } from '@/lib/auth/page-guard';
import { getLinkedDevices } from '@/lib/data/devices-repo';
import { DevicesPageClient } from '@/components/features/devices/devices-page-client';

/**
 * No instant shell is possible here: the `(app-shell)` layout above blocks on
 * `connection()` to read the session, so nothing on this route can be
 * prerendered. Without this Next reports "Could not validate `instant`" on
 * every visit — the layout's config does not cascade to pages.
 */
export const instant = false;

async function LinkedDevicesPageContent() {
  const user = await requirePageAuth((role) => role === 'GlobalAdmin');

  const devices = await getLinkedDevices(user.id);

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 min-h-0">
      <DevicesPageClient devices={devices} />
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
export default function LinkedDevicesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LinkedDevicesPageContent />
    </Suspense>
  );
}
