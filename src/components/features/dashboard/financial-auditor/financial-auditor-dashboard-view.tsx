"use client"

import { useMemo } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DataTable } from "@/components/shared/data-table"
import { cn } from "@/lib/utils"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { KpiMetricsRow } from "../shared/kpi-metrics-row"
import { DepartmentAllocationChart } from "../shared/department-allocation-chart"
import { InventoryStatusChart } from "../shared/inventory-status-chart"
import { RecentActivitiesList } from "../shared/recent-activities-list"
import { DataTablesContainer } from "../shared/data-tables-container"
import {
  useTopHighValueAssetsColumns,
  useWriteOffsColumns,
  useSoftwareOptimizationColumns,
} from "../shared/dashboard-table-columns"
import type { FinanceDashboardBatchData } from "@/actions/dashboard/financial-auditor"
import { useCurrency } from "@/components/providers/currency-provider"
import { convertCurrencyAmount } from "@/lib/currency"

interface FinancialAuditorDashboardViewProps {
  data: FinanceDashboardBatchData
  apiRates?: Record<string, number>
}

export function FinancialAuditorDashboardView({
  data,
  apiRates,
}: FinancialAuditorDashboardViewProps) {
  const { currency: currencyCode } = useCurrency();
  const exchangeRate = useMemo(
    () => convertCurrencyAmount(1, 'LKR', currencyCode, apiRates),
    [currencyCode, apiRates],
  );
  const topHighValueColumns = useTopHighValueAssetsColumns(currencyCode, exchangeRate)
  const writeOffsColumns = useWriteOffsColumns(currencyCode, apiRates)
  const softwareOptimizationColumns = useSoftwareOptimizationColumns(currencyCode, exchangeRate)

  const tableProps = {
    enableRowSelection: false,
    enableRowScroll: true,
    initialPageSize: 100,
    pageSizeOptions: [100],
    className: "min-h-[318px] max-h-[318px] text-xs",
    hideFooter: true,
  }

  const leftTables = (
    <Tabs defaultValue="topAssets" className="w-full">
      <TabsList className="h-10 mb-4 gap-1 bg-muted rounded-lg p-1 w-fit">
        <TabsTrigger
          value="topAssets"
          className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          Top High-Value Assets
        </TabsTrigger>
        <TabsTrigger
          value="writeOffs"
          className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          Asset Write-offs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="topAssets">
        <DataTable
          {...tableProps}
          columns={topHighValueColumns}
          data={data.topHighValueAssets}
          emptyState={{
            title: "No active assets",
            description: "There are no active assets with recorded costs.",
          }}
        />
      </TabsContent>
      <TabsContent value="writeOffs">
        <DataTable
          {...tableProps}
          columns={writeOffsColumns}
          data={data.writeOffsLedger}
          emptyState={{
            title: "No asset write-offs",
            description: "There are no completed asset write-offs/disposals.",
          }}
        />
      </TabsContent>
    </Tabs>
  )

  const rightTables = (
    <>
      <div className="h-10 mb-4 flex items-center">
        <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
          Software Seat Cost Optimization
        </h3>
      </div>
      <DataTable
        {...tableProps}
        columns={softwareOptimizationColumns}
        data={data.softwareOptimization}
        emptyState={{
          title: "No active software licenses",
          description: "No licenses found for optimization.",
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
        isAuditor={true}
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
    </div>
  )
}
