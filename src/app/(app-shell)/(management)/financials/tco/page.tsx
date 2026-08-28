import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { getTCOLedger, getFinancialsFilterOptions } from '@/actions/financials';
import { TCOLedger } from '@/components/features/financials/tco-ledger';
import { LedgerSummary } from '@/components/features/financials/ledger-summary';
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
    getFinancialsFilterOptions(),
  ]);

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
      <h1
        className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}
      >
        Total Cost of Ownership (TCO)
      </h1>
      <LedgerSummary
        asOf={response.summary.asOf}
        stats={[
          {
            label: 'Total cost of ownership',
            value: response.summary.totalTCO,
            currencyCode: 'LKR',
          },
          {
            label: 'Purchase cost',
            value: response.summary.totalPurchase,
            currencyCode: 'LKR',
          },
          {
            label: 'Maintenance spend',
            value: response.summary.totalMaintenance,
            currencyCode: 'LKR',
            tone: 'warning',
            hint: `${response.summary.maintenanceShare}% of purchase cost`,
          },
          {
            label: 'Assets repaired',
            value: `${response.summary.maintainedCount.toLocaleString()} of ${response.summary.assetCount.toLocaleString()}`,
          },
        ]}
      />

      <TCOLedger
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
export default function TCOLedgerPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TCOLedgerPageContent />
    </Suspense>
  );
}
