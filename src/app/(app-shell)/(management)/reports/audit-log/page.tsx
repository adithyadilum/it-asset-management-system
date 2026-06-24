import AuditLogClient from "@/components/features/system-audit-log/audit-log-client";
import { getAuditLogs } from "@/actions/audit-log";
import { getAuthenticatedUser } from "@/actions/auth";
import { redirect } from "next/navigation";

export default async function AuditLogPage() {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser || (currentUser.role !== "GlobalAdmin" && currentUser.role !== "FinancialAuditor")) {
    redirect("/403");
  }

  const initialResult = await getAuditLogs({ page: 1, pageSize: 16 });

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted">
      <AuditLogClient initialResult={initialResult} />
    </div>
  );
}
