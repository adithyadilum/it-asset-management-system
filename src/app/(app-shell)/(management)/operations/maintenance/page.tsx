import { MaintenanceShell } from '@/components/features/maintenance/maintenance-shell';
import { MaintenanceErrorBoundary } from '@/components/features/maintenance/maintenance-error-boundary';
import { requirePageAuth } from '@/lib/auth/page-guard';

export default async function MaintenanceAndRepairsPage() {
  const user = await requirePageAuth();

  return (
    <MaintenanceErrorBoundary>
      <MaintenanceShell userRole={user.role} />
    </MaintenanceErrorBoundary>
  );
}
