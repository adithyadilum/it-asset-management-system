import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import AuditLogClient from '@/components/features/system-audit-log/audit-log-client';
import { getAuditLogs } from '@/actions/audit-log';
import { requirePageAuth } from '@/lib/auth/page-guard';

async function AuditLogPageContent() {
  await requirePageAuth(
    (role) => role === 'GlobalAdmin' || role === 'FinancialAuditor'
  );

  const initialResult = await getAuditLogs({ page: 1, pageSize: 16 });

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted">
      <AuditLogClient initialResult={initialResult} />
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
export default function AuditLogPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AuditLogPageContent />
    </Suspense>
  );
}
