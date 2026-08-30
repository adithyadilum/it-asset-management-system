import { PageSkeleton } from '@/components/shared/page-skeleton';

/**
 * Fallback shown while navigating between pages in the app shell.
 *
 * The sidebar and header come from the layout and stay put, so only this region
 * changes. Each page also declares its own `<Suspense>` boundary around the part
 * that reads data — that is what lets a route stream rather than block, and
 * what Next requires to consider the navigation instant. This file covers the
 * gap before the page component itself is reached.
 */
export default function AppShellLoading() {
  return <PageSkeleton />;
}
