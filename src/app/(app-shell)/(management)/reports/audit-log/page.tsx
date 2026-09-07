import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import AuditLogClient from '@/components/features/system-audit-log/audit-log-client';
import { getAuditLogs } from '@/actions/audit-log';
import { requirePageAuth } from '@/lib/auth/page-guard';

/**
 * No instant shell is possible here: the `(app-shell)` layout above blocks on
 * `connection()` to read the session, so nothing on this route can be
 * prerendered. Without this Next reports "Could not validate `instant`" on
 * every visit — the layout's config does not cascade to pages.
 */
export const instant = false;

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
