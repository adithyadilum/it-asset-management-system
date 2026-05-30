import { MaintenanceShell } from '@/components/features/maintenance/maintenance-shell';
import { MaintenanceErrorBoundary } from '@/components/features/maintenance/maintenance-error-boundary';
import { getAuthenticatedUser } from '@/actions/auth';
import { redirect } from 'next/navigation';

export default async function MaintenanceAndRepairsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <MaintenanceErrorBoundary>
      <MaintenanceShell userRole={user.role} />
    </MaintenanceErrorBoundary>
  );
}