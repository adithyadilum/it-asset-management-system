import { MaintenanceShell } from '@/components/features/maintenance/maintenance-shell';
import { MaintenanceErrorBoundary } from '@/components/features/maintenance/maintenance-error-boundary';

export default function MaintenanceAndRepairsPage() {
  return (
    <MaintenanceErrorBoundary>
      <MaintenanceShell />
    </MaintenanceErrorBoundary>
  );
}