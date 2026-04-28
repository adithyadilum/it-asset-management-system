import AuditLogClient from "@/components/features/system-audit-log/audit-log-client";
import { getAuditLogs } from "@/actions/audit-log";

export default async function AuditLogPage() {
  const initialResult = await getAuditLogs({ page: 1, pageSize: 16 });

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50">
      <AuditLogClient initialResult={initialResult} />
    </div>
  );
}
