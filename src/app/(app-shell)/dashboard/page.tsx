import { getAuthenticatedUser } from "@/actions/auth"

import { DashboardHeader } from "@/components/features/dashboard/shared/dashboard-header"
import { DashboardRefreshProvider } from "@/components/features/dashboard/shared/dashboard-refresh-provider"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { UserRole } from "@/types/auth"
import { cookies } from "next/headers"
import { convertCurrencyAmount } from "@/lib/currency"
import { fetchLiveExchangeRates } from "@/lib/currency-server"
import { redirect } from "next/navigation"

// Role-specific action fetchers
import { getGlobalAdminDashboardData } from "@/actions/dashboard/global-admin"
import { getITDashboardData } from "@/actions/dashboard/it-operator"
import { getFinanceDashboardData } from "@/actions/dashboard/finance-auditor"

// Role-specific view components
import { GlobalAdminDashboardView } from "@/components/features/dashboard/global-admin/global-admin-dashboard-view"
import { ITOperatorDashboardView } from "@/components/features/dashboard/it-operator/it-operator-dashboard-view"
import { FinanceAuditorDashboardView } from "@/components/features/dashboard/financial-auditor/finance-auditor-dashboard-view"

export default async function DashboardPage() {
    const user = await getAuthenticatedUser()

    if (user?.role === "Employee") {
        redirect("/my-assets")
    }

    // ── Admin / Operator / Auditor dashboard ─────────────────────────────────
    const userRole: UserRole = user?.role || 'Employee'
    const userName = user?.name || 'Admin'

    const cookieStore = await cookies();
    const currencyCode = cookieStore.get('preferred_currency')?.value || 'LKR';
    const apiRates = (await fetchLiveExchangeRates()) || undefined;
    // DB values are stored in LKR. Compute a LKR→selectedCurrency multiplier so
    // the KPI component only needs to multiply raw values by this rate.
    const lkrToTargetRate = convertCurrencyAmount(1, 'LKR', currencyCode, apiRates);

    let dashboardView: React.ReactNode = null

    if (userRole === 'GlobalAdmin') {
        const data = await getGlobalAdminDashboardData()
        dashboardView = <GlobalAdminDashboardView data={data} currencyCode={currencyCode} exchangeRate={lkrToTargetRate} />
    } else if (userRole === 'ITOperator') {
        const itData = await getITDashboardData()
        dashboardView = <ITOperatorDashboardView data={itData} />
    } else if (userRole === 'FinanceAuditor') {
        const financeData = await getFinanceDashboardData()
        dashboardView = <FinanceAuditorDashboardView data={financeData} currencyCode={currencyCode} exchangeRate={lkrToTargetRate} apiRates={apiRates} />
    } else {
        dashboardView = (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                Access Denied or Unknown Role.
            </div>
        )
    }

    return (
        <DashboardRefreshProvider>
            <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-background overflow-hidden">
                {/* Pinned header */}
                <div className="shrink-0 px-6 pt-5 pb-3 bg-background">
                    <DashboardHeader userName={userName} userRole={userRole} />
                </div>

                {/* Scrollable content */}
                <ScrollArea className="flex-1 min-h-0">
                    {dashboardView}
                </ScrollArea>
            </main>
        </DashboardRefreshProvider>
    )
}
