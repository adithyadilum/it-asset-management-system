// web/src/app/(app-shell)/(management)/operations/maintenance/page.tsx
import { MaintenanceShell } from '@/components/features/maintenance/maintenance-shell';

export default function MaintenanceAndRepairsPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string | string[]; animate?: string | string[]; id?: string | string[] }>;
}) {
  return <MaintenanceShell />;
}