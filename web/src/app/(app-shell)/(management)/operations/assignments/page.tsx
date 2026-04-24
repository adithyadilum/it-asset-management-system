import { AssignmentsDashboard } from '@/components/features/operations/assignments/assignments-dashboard';
import { getAssignmentsDashboardData } from '@/lib/data/operations-assignments-repo';

export default async function AssignmentsPage() {
  const data = await getAssignmentsDashboardData();

  return <AssignmentsDashboard data={data} />;
}
