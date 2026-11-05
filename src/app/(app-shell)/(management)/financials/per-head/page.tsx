import { Suspense } from 'react';
import { getInitialPerHeadCostReport } from '@/actions/per-head-costs';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { PerHeadCostLedger } from '@/components/features/financials/per-head-cost-ledger';
export const instant = false;
export const metadata = { title: 'Per-head Cost Analysis | Tiqri Assets' };
async function Content() {
  const report = await getInitialPerHeadCostReport();
  return (
    <div className="h-full overflow-y-auto p-6">
      <PerHeadCostLedger
        initialData={report.data}
        initialQuery={report.query}
        filterOptions={report.filterOptions}
        canConfigure={report.canConfigure}
      />
    </div>
  );
}
export default function PerHeadPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
