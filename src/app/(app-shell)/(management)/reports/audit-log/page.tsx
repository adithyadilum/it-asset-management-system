import AuditLogClient from '@/components/features/system-audit-log/audit-log-client';
import { getAuditLogs } from '@/actions/audit-log';
import { requirePageAuth } from '@/lib/auth/page-guard';

export default async function AuditLogPage() {
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
