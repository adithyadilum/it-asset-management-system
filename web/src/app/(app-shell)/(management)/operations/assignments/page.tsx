import { AssignmentsDashboard } from '@/components/features/operations/assignments/assignments-dashboard';
import { getAssignmentsDashboardData } from '@/lib/data/operations-assignments-repo';

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

export default async function AssignmentsPage() {
  const data = await getAssignmentsDashboardData();
  const serializedData = serializeDatesForClient(data);

  return <AssignmentsDashboard data={serializedData} />;
}
