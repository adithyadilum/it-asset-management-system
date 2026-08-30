import { DashboardSkeleton } from '@/components/features/dashboard/dashboard-skeleton';

/**
 * Shown while navigating to the dashboard. The page declares the same skeleton
 * on its own Suspense boundary, so the two stay in step.
 */
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
