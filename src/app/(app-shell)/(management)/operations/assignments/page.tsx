import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { AssignmentsDashboard } from '@/components/features/operations/assignments/assignments-dashboard';
import {
  type AssignmentsDashboardTab,
  getAssignmentsDashboardData,
} from '@/lib/data/operations-assignments-repo';
import { requirePageAuth } from '@/lib/auth/page-guard';
import { canManageAssets } from '@/lib/auth/roles';

/**
 * No instant shell is possible here: the `(app-shell)` layout above blocks on
 * `connection()` to read the session, so nothing on this route can be
 * prerendered. Without this Next reports "Could not validate `instant`" on
 * every visit — the layout's config does not cascade to pages.
 */
export const instant = false;

function serializeDatesForClient<T>(value: T): T {
  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeDatesForClient(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        serializeDatesForClient(nestedValue),
      ])
    ) as T;
  }

  return value;
}

async function AssignmentsPageContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageAuth(canManageAssets);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tabParam =
    typeof resolvedSearchParams?.tab === 'string'
      ? resolvedSearchParams.tab
      : undefined;
  // Map UI tab ids to repo tab keys
  const requestedTab = tabParam === 'assigned-assets' ? 'assigned' : undefined;

  const data = await getAssignmentsDashboardData(
    requestedTab as AssignmentsDashboardTab | undefined
  );
  const serializedData = serializeDatesForClient(data);

  return <AssignmentsDashboard data={serializedData as never} />;
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
export default function AssignmentsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AssignmentsPageContent {...props} />
    </Suspense>
  );
}
