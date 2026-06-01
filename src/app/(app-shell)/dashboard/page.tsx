import { getAuthenticatedUser } from "@/actions/auth"

import { DashboardHeader } from "@/components/features/dashboard/shared/dashboard-header"
import { DashboardRefreshProvider } from "@/components/features/dashboard/shared/dashboard-refresh-provider"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { UserRole } from "@/types/auth"
import { cookies } from "next/headers"
import { fetchLiveExchangeRates, convertCurrencyAmount } from "@/lib/currency"
import { redirect } from "next/navigation"

// Role-specific action fetchers
import { getAdminDashboardData } from "@/actions/dashboard/admin"
import { getITDashboardData } from "@/actions/dashboard/it-operator"
import { getFinanceDashboardData } from "@/actions/dashboard/finance"

// Role-specific view components
import { AdminDashboardView } from "@/components/features/dashboard/admin/admin-dashboard-view"
import { ITDashboardView } from "@/components/features/dashboard/itoperator/it-dashboard-view"
import { FinanceDashboardView } from "@/components/features/dashboard/financialauditor/finance-dashboard-view"

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
    const usdToTargetRate = convertCurrencyAmount(1, 'USD', currencyCode, apiRates);

    let dashboardView: React.ReactNode = null

    if (userRole === 'GlobalAdmin') {
        const adminData = await getAdminDashboardData()
        dashboardView = <AdminDashboardView data={adminData} currencyCode={currencyCode} exchangeRate={usdToTargetRate} />
    } else if (userRole === 'ITOperator') {
        const itData = await getITDashboardData()
        dashboardView = <ITDashboardView data={itData} />
    } else if (userRole === 'FinanceAuditor') {
        const financeData = await getFinanceDashboardData()
        dashboardView = <FinanceDashboardView data={financeData} currencyCode={currencyCode} exchangeRate={usdToTargetRate} apiRates={apiRates} />
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
