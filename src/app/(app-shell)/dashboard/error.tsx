'use client';

import { PageLoadError } from '@/components/shared/page-load-error';

export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageLoadError {...props} title="Unable to load the dashboard" />;
}
