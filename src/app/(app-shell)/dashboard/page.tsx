import { getAuthenticatedUser } from "@/actions/auth"

import { DashboardHeader } from "@/components/features/dashboard/admin/dashboard-header"
import { DashboardRefreshProvider } from "@/components/features/dashboard/admin/dashboard-refresh-provider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { KpiMetricsRow } from "@/components/features/dashboard/admin/kpi-metrics-row"
import { DashboardChartsRow } from "@/components/features/dashboard/admin/dashboard-charts-row"
import { DashboardTablesRowClient } from "@/components/features/dashboard/admin/dashboard-tables-row-client"

import { getDashboardBatchData } from "@/actions/dashboard"
import type { UserRole } from "@/types/auth"
import { cookies } from "next/headers"
import { fetchLiveExchangeRates, convertCurrencyAmount } from "@/lib/currency"
import { redirect } from "next/navigation"

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
    const lkrToTargetRate = convertCurrencyAmount(1, 'LKR', currencyCode, apiRates);

    const data = await getDashboardBatchData()

    return (
        <DashboardRefreshProvider>
            <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-background overflow-hidden">
                {/* Pinned header */}
                <div className="shrink-0 px-6 pt-5 pb-3 bg-background">
                    <DashboardHeader userName={userName} userRole={userRole} />
                </div>

                {/* Scrollable content */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="px-6 py-1 pb-5 flex flex-col gap-6">
                        <KpiMetricsRow metrics={data.kpiMetrics} currencyCode={currencyCode} exchangeRate={lkrToTargetRate} />

                        <div className="flex flex-col gap-4">
                            <DashboardChartsRow
                                activities={data.recentActivities}
                                inventoryStatus={data.inventoryStatus}
                                departmentAllocation={data.departmentAllocation}
                                userRole={userRole}
                            />
                        </div>
                        <div className="flex flex-col gap-4">
                            <DashboardTablesRowClient
                                overdueReturns={data.overdueReturns}
                                pendingDisposals={data.pendingDisposals}
                                highMaintenanceAssets={data.highMaintenanceAssets}
                                userRole={userRole}
                            />
                        </div>
                    </div>
                </ScrollArea>
            </main>
        </DashboardRefreshProvider>
    )
}
