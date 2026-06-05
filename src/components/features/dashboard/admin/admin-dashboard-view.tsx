"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DataTable } from "@/components/shared/data-table"
import { cn } from "@/lib/utils"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { DisposeAssetsRequestDialog, type SelectedAssetLite } from "@/components/features/disposals/dispose-assets-request-dialog"
import { tiqriToast } from "@/components/shared/sonner"
import { sendAssignmentReminderAction } from "@/actions/assignments"
import { KpiMetricsRow } from "../shared/kpi-metrics-row"
import { DepartmentAllocationChart } from "../shared/department-allocation-chart"
import { InventoryStatusChart } from "../shared/inventory-status-chart"
import { RecentActivitiesList } from "../shared/recent-activities-list"
import { DataTablesContainer } from "../shared/data-tables-container"
import { useOverdueColumns, usePendingDisposalColumns, useHighMaintenanceColumns } from "../shared/dashboard-table-columns"
import type { AdminDashboardBatchData } from "@/actions/dashboard/admin"
import type { OverdueReturnRow, HighMaintenanceRow } from "@/actions/dashboard/shared"

interface AdminDashboardViewProps {
  data: AdminDashboardBatchData
  currencyCode?: string
  exchangeRate?: number
}

export function AdminDashboardView({
  data,
  currencyCode = "LKR",
  exchangeRate = 1,
}: AdminDashboardViewProps) {
  const [flaggedAsset, setFlaggedAsset] = useState<SelectedAssetLite | null>(null)
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false)
  const [sendingReminderIds, setSendingReminderIds] = useState<number[]>([])

  const handleFlagClick = (asset: HighMaintenanceRow) => {
    setFlaggedAsset({
      id: asset.assetId,
      assetTag: asset.assetTag,
      assetName: asset.assetName,
    })
    setIsFlagDialogOpen(true)
  }

  const handleSendReminder = async (row: OverdueReturnRow) => {
    setSendingReminderIds((prev) => [...prev, row.assignmentId])
    try {
      const result = await sendAssignmentReminderAction([row.assignmentId])
      if (result.success) {
        tiqriToast.success("Reminder sent successfully")
      } else {
        tiqriToast.error(result.error || "Failed to send reminder")
      }
    } catch {
      tiqriToast.error("Failed to send reminder due to an unexpected error")
    } finally {
      setSendingReminderIds((prev) => prev.filter((id) => id !== row.assignmentId))
    }
  }

  const overdueColumns = useOverdueColumns("Send Reminder", handleSendReminder, sendingReminderIds)
  const pendingColumns = usePendingDisposalColumns("GlobalAdmin")
  const lemonsColumns = useHighMaintenanceColumns(handleFlagClick)

  const tableProps = {
    enableRowSelection: false,
    enableRowScroll: true,
    initialPageSize: 100,
    pageSizeOptions: [100],
    className: "min-h-[318px] max-h-[318px] text-xs",
    hideFooter: true,
  }

  const leftTables = (
    <Tabs defaultValue="overdue" className="w-full">
      <TabsList className="h-10 mb-4 gap-1 bg-muted rounded-lg p-1 w-fit">
        <TabsTrigger
          value="overdue"
          className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          Overdue Returns
          <span className={cn(
            "text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none transition-colors",
            "group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground",
            "group-data-[state=inactive]:bg-background group-data-[state=inactive]:text-primary border border-primary/30"
          )}>
            {data.overdueReturns.length}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="pending"
          className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          Pending Disposals
          <span className={cn(
            "text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none transition-colors",
            "group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground",
            "group-data-[state=inactive]:bg-background group-data-[state=inactive]:text-primary border border-primary/30"
          )}>
            {data.pendingDisposals.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overdue">
        <DataTable
          {...tableProps}
          columns={overdueColumns}
          data={data.overdueReturns}
          emptyState={{
            title: "No overdue returns",
            description: "All assets have been returned on time.",
          }}
        />
      </TabsContent>
      <TabsContent value="pending">
        <DataTable
          {...tableProps}
          columns={pendingColumns}
          data={data.pendingDisposals}
          emptyState={{
            title: "No pending disposals",
            description: "There are no disposal requests awaiting review.",
          }}
        />
      </TabsContent>
    </Tabs>
  )

  const rightTables = (
    <>
      <div className="h-10 mb-4 flex items-center">
        <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
          High-Maintenance Assets
        </h3>
      </div>
      <DataTable
        {...tableProps}
        columns={lemonsColumns}
        data={data.highMaintenanceAssets}
        emptyState={{
          title: "No high-maintenance assets",
          description: "No assets have 3 or more repair tickets.",
        }}
      />
    </>
  )

  return (
    <div className="px-6 py-1 pb-5 flex flex-col gap-6">
      {/* KPIs */}
      <KpiMetricsRow
        metrics={data.kpiMetrics}
        currencyCode={currencyCode}
        exchangeRate={exchangeRate}
      />

      {/* Charts Grid */}
      <div className="grid gap-4 min-h-[280px] grid-cols-1 lg:grid-cols-3">
        <DepartmentAllocationChart allocationData={data.departmentAllocation} />
        <InventoryStatusChart
          inventoryData={data.inventoryStatus.inventoryData}
          utilizationRate={data.inventoryStatus.utilizationRate}
        />
        <RecentActivitiesList activities={data.recentActivities} />
      </div>

      {/* Tables Container */}
      <DataTablesContainer leftSection={leftTables} rightSection={rightTables} />

      <DisposeAssetsRequestDialog
        open={isFlagDialogOpen}
        onOpenChange={setIsFlagDialogOpen}
        selectedAssets={flaggedAsset ? [flaggedAsset] : []}
        onSubmitted={(result) => {
          setIsFlagDialogOpen(false)
          setFlaggedAsset(null)
          if (result.inserted > 0) {
            tiqriToast.success("Asset Flagged: The asset has been successfully flagged for disposal and is awaiting admin approval.")
          } else if (result.skipped > 0) {
            tiqriToast.info("Disposal Request: This asset is already pending disposal or retired.")
          }
        }}
      />
    </div>
  )
}
