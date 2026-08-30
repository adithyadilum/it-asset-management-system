'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/data-table';
import { cn } from '@/lib/utils';
import { DisposeAssetsRequestDialog } from '@/components/features/disposals/dispose-assets-request-dialog';
import type { SelectedAssetLite } from '@/types/disposals';
import { tiqriToast } from '@/components/shared/sonner';
import { sendAssignmentReminderAction } from '@/actions/assignments';
import { KpiMetricsRow } from '../shared/kpi-metrics-row';
import { DepartmentAllocationChart } from '../shared/department-allocation-chart';
import { InventoryStatusChart } from '../shared/inventory-status-chart';
import { RecentActivitiesList } from '../shared/recent-activities-list';
import { DataTablesContainer } from '../shared/data-tables-container';
import {
  useOverdueColumns,
  usePendingDisposalColumns,
  useHighMaintenanceColumns,
  usePendingMaintenanceColumns,
} from '../shared/dashboard-table-columns';
import type { GlobalAdminDashboardBatchData } from '@/actions/dashboard/global-admin';
import type { OverdueReturnRow, HighMaintenanceRow } from '@/types/dashboard';
import { useCurrency } from '@/components/providers/currency-provider';
import { convertCurrencyAmount } from '@/lib/currency';

interface GlobalAdminDashboardViewProps {
  data: GlobalAdminDashboardBatchData;
  apiRates?: Record<string, number>;
}

export function GlobalAdminDashboardView({
  data,
  apiRates,
}: GlobalAdminDashboardViewProps) {
  const { currency: currencyCode } = useCurrency();
  const exchangeRate = useMemo(
    () => convertCurrencyAmount(1, 'LKR', currencyCode, apiRates),
    [currencyCode, apiRates]
  );
  const [flaggedAsset, setFlaggedAsset] = useState<SelectedAssetLite | null>(
    null
  );
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [sendingReminderIds, setSendingReminderIds] = useState<number[]>([]);

  const handleFlagClick = (asset: HighMaintenanceRow) => {
    setFlaggedAsset({
      id: asset.assetId,
      assetTag: asset.assetTag,
      assetName: asset.assetName,
    });
    setIsFlagDialogOpen(true);
  };

  const handleSendReminder = async (row: OverdueReturnRow) => {
    setSendingReminderIds((prev) => [...prev, row.assignmentId]);
    try {
      const result = await sendAssignmentReminderAction([row.assignmentId]);
      if (result.success) {
        tiqriToast.success('Reminder sent successfully');
      } else {
        tiqriToast.error(result.error || 'Failed to send reminder');
      }
    } catch {
      tiqriToast.error('Failed to send reminder due to an unexpected error');
    } finally {
      setSendingReminderIds((prev) =>
        prev.filter((id) => id !== row.assignmentId)
      );
    }
  };

  const overdueColumns = useOverdueColumns(
    'Send Reminder',
    handleSendReminder,
    sendingReminderIds
  );
  const pendingColumns = usePendingDisposalColumns('GlobalAdmin');
  const lemonsColumns = useHighMaintenanceColumns(handleFlagClick);
  const pendingMaintenanceColumns = usePendingMaintenanceColumns();

  const tableProps = {
    enableRowSelection: false,
    enableRowScroll: true,
    initialPageSize: 100,
    pageSizeOptions: [100],
    className: 'min-h-[318px] max-h-[318px] text-xs',
    hideFooter: true,
  };

  const leftTables = (
    <Tabs defaultValue="overdue" className="w-full">
      <TabsList className="h-10 mb-4 gap-1 bg-muted rounded-lg p-1 w-fit">
        <TabsTrigger
          value="overdue"
          className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          Overdue Returns
          <span
            className={cn(
              'text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none transition-colors',
              'group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground',
              'group-data-[state=inactive]:bg-background group-data-[state=inactive]:text-primary border border-primary/30'
            )}
          >
            {data.overdueReturns.length}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="pending"
          className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          Pending Disposals
          <span
            className={cn(
              'text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none transition-colors',
              'group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground',
              'group-data-[state=inactive]:bg-background group-data-[state=inactive]:text-primary border border-primary/30'
            )}
          >
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
            title: 'No overdue returns',
            description: 'All assets have been returned on time.',
          }}
        />
      </TabsContent>
      <TabsContent value="pending">
        <DataTable
          {...tableProps}
          columns={pendingColumns}
          data={data.pendingDisposals}
          emptyState={{
            title: 'No pending disposals',
            description: 'There are no disposal requests awaiting review.',
          }}
        />
      </TabsContent>
    </Tabs>
  );

  // Two questions about the same subject: what needs fixing now, and what keeps
  // needing fixing. Tabbed like the pair on the left rather than stacked.
  const rightTables = (
    <Tabs defaultValue="maintenance" className="w-full">
      <TabsList className="h-10 mb-4 gap-1 bg-muted rounded-lg p-1 w-fit">
        <TabsTrigger
          value="maintenance"
          className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          Pending Maintenance
          <span
            className={cn(
              'text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none transition-colors',
              'group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground',
              'group-data-[state=inactive]:bg-background group-data-[state=inactive]:text-primary border border-primary/30'
            )}
          >
            {data.pendingMaintenance.length}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="lemons"
          className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          High-Maintenance Assets
          <span
            className={cn(
              'text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none transition-colors',
              'group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground',
              'group-data-[state=inactive]:bg-background group-data-[state=inactive]:text-primary border border-primary/30'
            )}
          >
            {data.highMaintenanceAssets.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="maintenance">
        <DataTable
          {...tableProps}
          columns={pendingMaintenanceColumns}
          data={data.pendingMaintenance}
          emptyState={{
            title: 'No maintenance requests',
            description: 'Nothing has been reported and left unactioned.',
          }}
        />
      </TabsContent>
      <TabsContent value="lemons">
        <DataTable
          {...tableProps}
          columns={lemonsColumns}
          data={data.highMaintenanceAssets}
          emptyState={{
            title: 'No high-maintenance assets',
            description: 'No assets have 3 or more repair tickets.',
          }}
        />
      </TabsContent>
    </Tabs>
  );

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
      <DataTablesContainer
        leftSection={leftTables}
        rightSection={rightTables}
      />

      <DisposeAssetsRequestDialog
        open={isFlagDialogOpen}
        onOpenChange={setIsFlagDialogOpen}
        selectedAssets={flaggedAsset ? [flaggedAsset] : []}
        onSubmitted={(result) => {
          setIsFlagDialogOpen(false);
          setFlaggedAsset(null);
          if (result.inserted > 0) {
            tiqriToast.success(
              'Asset Flagged: The asset has been successfully flagged for disposal and is awaiting admin approval.'
            );
          } else if (result.skipped > 0) {
            tiqriToast.info(
              'Disposal Request: This asset is already pending disposal or retired.'
            );
          }
        }}
      />
    </div>
  );
}
