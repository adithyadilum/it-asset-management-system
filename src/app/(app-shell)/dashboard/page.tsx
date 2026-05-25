import { getAuthenticatedUser } from "@/actions/auth"
import { getCurrentEmployeeAssets } from "@/actions/employee"
import { DashboardHeader } from "@/components/features/dashboard/admin/dashboard-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { KpiMetricsRow } from "@/components/features/dashboard/admin/kpi-metrics-row"
import { DashboardChartsRow } from "@/components/features/dashboard/admin/dashboard-charts-row"
import { DashboardTablesRow } from "@/components/features/dashboard/admin/dashboard-tables-row"
import { AssetCard } from "@/components/shared/asset-card"
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@/components/ui/empty"
import { HardDrive, Laptop, Monitor, Smartphone } from "lucide-react"
import { 
    getDashboardOverdueReturns, 
    getDashboardPendingDisposals, 
    getDashboardHighMaintenanceAssets,
    getDashboardRecentActivities,
    getDashboardInventoryStatus,
    getDashboardDepartmentAllocation,
    getDashboardKpiMetrics,
    getDashboardRecentWriteOffs
} from "@/actions/dashboard"
import { canAccessOperations, canAccessFinancials, isEmployee } from "@/lib/auth/roles"

function getAssetPresentation(modelName: string) {
    const normalized = modelName.trim().toLowerCase()

    if (normalized.includes("macbook") || normalized.includes("laptop") || normalized.includes("thinkpad") || normalized.includes("desktop")) {
        return {
            label: "Laptop",
            icon: <Laptop className="h-8 w-8" />,
        }
    }

    if (normalized.includes("iphone") || normalized.includes("phone") || normalized.includes("mobile")) {
        return {
            label: "Phone",
            icon: <Smartphone className="h-8 w-8" />,
        }
    }

    if (normalized.includes("monitor") || normalized.includes("display")) {
        return {
            label: "Monitor",
            icon: <Monitor className="h-8 w-8" />,
        }
    }

    return {
        label: "Asset",
        icon: <HardDrive className="h-8 w-8" />,
    }
}

export default async function DashboardPage() {
    const user = await getAuthenticatedUser()

    if (user && isEmployee(user.role)) {
        const employeeAssets = await getCurrentEmployeeAssets()

        return (
            <section className="px-4 pb-4 pt-6 md:px-6 md:pb-6">
                <h1 className="text-foreground text-2xl font-semibold leading-8">Welcome back, {user.name}</h1>
                <p className="text-muted-foreground text-base font-normal leading-6">Here is the equipment currently assigned to you.</p>
                <div className="mt-6 grid gap-4 xl:grid-cols-3">
                    {employeeAssets.length > 0 ? (
                        employeeAssets.map((asset) => {
                            const presentation = getAssetPresentation(asset.modelName)

                            return (
                                <AssetCard
                                    key={asset.assignmentId}
                                    assetType={presentation.label}
                                    name={asset.modelName}
                                    status={asset.status}
                                    icon={presentation.icon}
                                    assetId={asset.assetTag}
                                    assignedDate={new Intl.DateTimeFormat("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    }).format(new Date(asset.assignedDate))}
                                />
                            )
                        })
                    ) : (
                        <div className="xl:col-span-3">
                            <Empty className="min-h-52 rounded-md border-0 p-4">
                                <EmptyHeader className="max-w-md">
                                    <EmptyTitle>No active assets assigned</EmptyTitle>
                                    <EmptyDescription className="max-w-md text-balance">
                                        We couldn&apos;t find any hardware linked to your profile.
                                        <br />
                                        If you&apos;re expecting a new device, please check back later or contact the IT Helpdesk.
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        </div>
                    )}
                </div>
            </section>
        )
    }

    // Admin/Auditor logic
    const canSeeOverdue = user ? canAccessOperations(user.role) : false;
    const canSeePending = user ? canAccessFinancials(user.role) : false;
    const canSeeHighMaintenance = user ? canAccessOperations(user.role) : false;
    const canSeeRecentActivities = user ? canAccessFinancials(user.role) : false;
    const canSeeWriteOffs = user ? canAccessFinancials(user.role) : false;

    const [
        overdueReturns, 
        pendingDisposals, 
        highMaintenanceAssets,
        recentActivities,
        inventoryStatus,
        departmentAllocation,
        kpiMetrics,
        recentWriteOffs
    ] = await Promise.all([
        canSeeOverdue ? getDashboardOverdueReturns() : Promise.resolve([]),
        canSeePending ? getDashboardPendingDisposals() : Promise.resolve([]),
        canSeeHighMaintenance ? getDashboardHighMaintenanceAssets() : Promise.resolve([]),
        canSeeRecentActivities ? getDashboardRecentActivities() : Promise.resolve([]),
        getDashboardInventoryStatus(),
        getDashboardDepartmentAllocation(),
        getDashboardKpiMetrics(),
        canSeeWriteOffs ? getDashboardRecentWriteOffs() : Promise.resolve([]),
    ])

    return (
        <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-white overflow-hidden">
            {/* Pinned header */}
            <div className="shrink-0 px-6 pt-5 pb-3">
                <DashboardHeader />
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="px-6 py-5 flex flex-col gap-6">
                    <KpiMetricsRow metrics={kpiMetrics} />

                    <div className="flex flex-col gap-4">
                        <DashboardChartsRow 
                            activities={recentActivities} 
                            inventoryStatus={inventoryStatus}
                            departmentAllocation={departmentAllocation}
                            userRole={user?.role || 'Employee'}
                        />
                        <DashboardTablesRow 
                            overdueReturns={overdueReturns}
                            pendingDisposals={pendingDisposals}
                            highMaintenanceAssets={highMaintenanceAssets}
                            recentWriteOffs={recentWriteOffs}
                            userRole={user?.role || 'Employee'}
                        />
                    </div>
                </div>
            </ScrollArea>
        </main>
    )
}
