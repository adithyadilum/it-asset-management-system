import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import {
  getDepreciationLedger,
  getFinancialsFilterOptions,
} from '@/actions/financials';
import { DepreciationLedger } from '@/components/features/financials/depreciation-ledger';
import { LedgerSummary } from '@/components/features/financials/ledger-summary';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

export const metadata = {
  title: 'Depreciation Ledger | Tiqri Assets',
};

async function DepreciationLedgerPageContent() {
  // 1. Pass the initial pagination parameters
  // Fetched alongside the ledger so the filter dropdowns offer every category
  // and location, not only those on the first page of rows.
  const [response, filterOptions] = await Promise.all([
    getDepreciationLedger({ page: 1, pageSize: 16 }),
    getFinancialsFilterOptions(),
  ]);

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
      <h1
        className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}
      >
        Depreciation Ledger
      </h1>
      <LedgerSummary
        asOf={response.summary.asOf}
        stats={[
          {
            label: 'Assets tracked',
            value: response.summary.assetCount.toLocaleString(),
            hint: `${response.summary.fullyDepreciated.toLocaleString()} fully depreciated`,
          },
          {
            label: 'Original cost',
            value: response.summary.totalCost,
            currencyCode: 'LKR',
          },
          {
            label: 'Current book value',
            value: response.summary.totalBookValue,
            currencyCode: 'LKR',
            tone: 'positive',
          },
          {
            label: 'Accumulated depreciation',
            value: response.summary.accumulatedDepreciation,
            currencyCode: 'LKR',
            tone: 'warning',
          },
        ]}
      />

      <DepreciationLedger
        initialData={response.data}
        initialPageCount={response.meta.totalPages}
        filterOptions={filterOptions}
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
export default function DepreciationLedgerPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DepreciationLedgerPageContent />
    </Suspense>
  );
}
