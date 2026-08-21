import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { getDepreciationLedger } from '@/actions/financials';
import { DepreciationLedger } from '@/components/features/financials/depreciation-ledger';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

export const metadata = {
  title: 'Depreciation Ledger | Tiqri Assets',
};

async function DepreciationLedgerPageContent() {
  // 1. Pass the initial pagination parameters
  const response = await getDepreciationLedger({ page: 1, pageSize: 16 });

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
      <h1
        className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}
      >
        Depreciation Ledger
      </h1>
      <DepreciationLedger
        initialData={response.data}
        initialPageCount={response.meta.totalPages}
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
