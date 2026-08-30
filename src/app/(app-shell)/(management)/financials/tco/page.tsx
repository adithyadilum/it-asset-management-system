import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { getTCOLedger, getFinancialsFilterOptions } from '@/actions/financials';
import { TCOLedger } from '@/components/features/financials/tco-ledger';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

export const metadata = {
  title: 'Total Cost of Ownership | Tiqri Assets',
};

async function TCOLedgerPageContent() {
  // 1. Pass the initial pagination parameters
  // Fetched alongside the ledger so the filter dropdowns offer every category
  // and location, not only those on the first page of rows.
  const [response, filterOptions] = await Promise.all([
    getTCOLedger({ page: 1, pageSize: 16 }),
    // TCO reports software alongside everything else, so it keeps the pillar.
    getFinancialsFilterOptions({ includeSoftwarePillar: true }),
  ]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <h1
        className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}
      >
        Total Cost of Ownership (TCO)
      </h1>
      <TCOLedger
        initialData={response.data}
        initialPageCount={response.meta.totalPages}
        filterOptions={filterOptions}
        initialSummary={response.summary}
        initialTrend={response.trend}
      />
    </div>
  );
}

/**
 * Streams rather than blocks.
 *
 * The body above reads the session and queries the database, none of
 * which can be prerendered. Keeping the default export synchronous lets
 * this route paint its chrome immediately and fill in the content when
 * the data arrives, instead of the navigation waiting on the slowest
 * query.
 */
export default function TCOLedgerPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TCOLedgerPageContent />
    </Suspense>
  );
}
