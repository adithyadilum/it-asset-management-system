import { redirect } from 'next/navigation';

import { AssignmentsDashboard } from '@/components/features/operations/assignments/assignments-dashboard';
import { getAssignmentsDashboardData } from '@/actions/operations';
import { type AssignmentsDashboardTab } from '@/lib/data/operations-assignments-repo';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';

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
      ]),
    ) as T;
  }

  return value;
}

export default async function AssignmentsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser || !canManageAssets(currentUser.role)) {
    redirect('/403');
  }

  const tabParam = typeof searchParams?.tab === 'string' ? searchParams.tab : undefined;
  // Map UI tab ids to repo tab keys
  const requestedTab = tabParam === 'assigned-assets' ? 'assigned' : undefined;

  const data = await getAssignmentsDashboardData(requestedTab as AssignmentsDashboardTab | undefined);
  const serializedData = serializeDatesForClient(data);

  return <AssignmentsDashboard data={serializedData as never} />;
}
