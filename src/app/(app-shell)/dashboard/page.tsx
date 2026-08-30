import { Suspense } from 'react';
import { DashboardSkeleton } from '@/components/features/dashboard/dashboard-skeleton';
import { getAuthenticatedUser } from '@/actions/auth';

import { DashboardHeader } from '@/components/features/dashboard/shared/dashboard-header';
import { DashboardRefreshProvider } from '@/components/features/dashboard/shared/dashboard-refresh-provider';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UserRole } from '@/types/auth';
import { fetchLiveExchangeRates } from '@/lib/currency-server';
import { redirect } from 'next/navigation';

// Role-specific action fetchers
import { getGlobalAdminDashboardData } from '@/actions/dashboard/global-admin';
import { getITDashboardData } from '@/actions/dashboard/it-operator';
import { getFinanceDashboardData } from '@/actions/dashboard/financial-auditor';

// Role-specific view components
import { GlobalAdminDashboardView } from '@/components/features/dashboard/global-admin/global-admin-dashboard-view';
import { ITOperatorDashboardView } from '@/components/features/dashboard/it-operator/it-operator-dashboard-view';
import { FinancialAuditorDashboardView } from '@/components/features/dashboard/financial-auditor/financial-auditor-dashboard-view';

async function DashboardPageContent() {
  const user = await getAuthenticatedUser();

  if (user?.role === 'Employee') {
    redirect('/my-assets');
  }

  // ── Admin / Operator / Auditor dashboard ─────────────────────────────────
  const userRole: UserRole = user?.role || 'Employee';
  const userName = user?.name || 'Admin';

  const apiRates = (await fetchLiveExchangeRates()) || undefined;

  let dashboardView: React.ReactNode = null;

  if (userRole === 'GlobalAdmin') {
    const adminData = await getGlobalAdminDashboardData();
    dashboardView = (
      <GlobalAdminDashboardView data={adminData} apiRates={apiRates} />
    );
  } else if (userRole === 'ITOperator') {
    const itData = await getITDashboardData();
    dashboardView = <ITOperatorDashboardView data={itData} />;
  } else if (userRole === 'FinancialAuditor') {
    const financeData = await getFinanceDashboardData();
    dashboardView = (
      <FinancialAuditorDashboardView data={financeData} apiRates={apiRates} />
    );
  } else {
    dashboardView = (
      <div className="px-6 py-8 text-center text-muted-foreground text-sm">
        Access Denied or Unknown Role.
      </div>
    );
  }

  return (
    <DashboardRefreshProvider>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-background overflow-hidden">
        {/* Pinned header */}
        <div className="shrink-0 px-6 pt-5 pb-3 bg-background">
          <DashboardHeader userName={userName} userRole={userRole} />
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 min-h-0">{dashboardView}</ScrollArea>
      </main>
    </DashboardRefreshProvider>
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
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}
