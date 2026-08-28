import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import {
  getWriteOffsLedger,
  getFinancialsFilterOptions,
} from '@/actions/financials';
import { WriteOffsLedger } from '@/components/features/financials/write-offs-ledger';
import { LedgerSummary } from '@/components/features/financials/ledger-summary';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

export const metadata = {
  title: 'Write-Offs & Salvage | Tiqri Assets',
};

async function SalvageLedgerPageContent() {
  // 1. Pass the initial pagination parameters
  // Fetched alongside the ledger so the filter dropdowns offer every category
  // and location, not only those on the first page of rows.
  const [response, filterOptions] = await Promise.all([
    getWriteOffsLedger({ page: 1, pageSize: 16 }),
    getFinancialsFilterOptions(),
  ]);

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
      <h1
        className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}
      >
        Write-Offs & Salvage
      </h1>
      <LedgerSummary
        asOf={response.summary.asOf}
        stats={[
          {
            label: 'Disposals',
            value: response.summary.disposalCount.toLocaleString(),
            hint: Object.entries(response.summary.byStatus)
              .map(([status, count]) => `${count} ${status.toLowerCase()}`)
              .join(' · '),
          },
          {
            label: 'Written off',
            value: response.summary.totalWrittenOff,
            currencyCode: 'LKR',
            hint: 'Book value at disposal',
          },
          {
            label: 'Salvage realised',
            value: response.summary.totalRealisedSalvage,
            currencyCode: 'LKR',
            tone: 'positive',
          },
          {
            label: 'Against expected',
            value: response.summary.salvageVariance,
            currencyCode: 'LKR',
            tone: response.summary.salvageVariance < 0 ? 'warning' : 'positive',
            hint: `Expected ${response.summary.totalExpectedSalvage.toLocaleString()}`,
          },
        ]}
      />

      <WriteOffsLedger
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
export default function SalvageLedgerPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SalvageLedgerPageContent />
    </Suspense>
  );
}
