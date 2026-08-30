'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AssignmentsPanels } from './assignments-panels';
import { MultiAssetAssignmentModal } from './multi-asset-assignment-modal';
import {
  ProcessReturnModal,
  type ReturnAssetItem,
} from './process-return-modal';
import { ModuleNavigationTabs } from '@/components/shared/module-navigation-tabs';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { TabsContent } from '@/components/ui/tabs';
import type { AssignmentsDashboardData } from '@/lib/data/operations-assignments-repo';

import { AssignmentsTable, type AssetAssignmentRow } from './assignments-table';
import { getAssignmentColumns } from './assignments-columns';
import { useAssignmentsDashboard } from './use-assignments-dashboard';

interface AssignmentsDashboardProps {
  data: AssignmentsDashboardData;
}

const tabs = [
  { id: 'available-assets', label: 'Available Assets' },
  { id: 'assigned-assets', label: 'Assigned Assets' },
  { id: 'returned-assets', label: 'Returned Assets' },
];

export function AssignmentsDashboard({ data }: AssignmentsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isProcessReturnModalOpen, setIsProcessReturnModalOpen] =
    useState(false);
  const [processReturnAsset, setProcessReturnAsset] =
    useState<ReturnAssetItem | null>(null);

  const {
    searchValue,
    setSearchValue,
    appliedFilters,
    rowSelection,
    setRowSelection,
    applyFilter,
    clearFilter,
    clearAllFilters,
    filterFieldConfigs,
    assetRows,
    filteredAvailableRows,
    filteredAssignedRows,
    filteredReturnedRows,
    returnedRows,
    selectionActionsAvailable,
    selectionActionsAssigned,
    isMultiAssignModalOpen,
    setIsMultiAssignModalOpen,
    multiAssignAssets,
    setMultiAssignAssets,
  } = useAssignmentsDashboard(data);

  const columns = useMemo(() => getAssignmentColumns(), []);

  // Panel State from URL (following the Registry Pattern)
  const activeAssetId = searchParams.get('id') || '';
  const currentPanel = searchParams.get('panel');
  const isPanelOpen = currentPanel === 'record' && activeAssetId !== '';

  // Auto-open Process Return modal if navigating from Asset Details Panel
  useEffect(() => {
    const processReturnId = searchParams.get('processReturnId');
    if (processReturnId && returnedRows.length > 0) {
      const targetRowIndex = returnedRows.findIndex(
        (r) => r.assetId === processReturnId
      );
      if (targetRowIndex >= 0) {
        const row = returnedRows[targetRowIndex];

        const t = setTimeout(() => {
          setRowSelection({ [targetRowIndex]: true });

          setProcessReturnAsset({
            assetId: row.assetId,
            assetTag: row.assetTag,
            assetName: row.assetName,
            assignee: row.assignedTo,
            assignmentId: row.assignmentId,
          });
          setIsProcessReturnModalOpen(true);
        }, 0);

        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('processReturnId');
        router.replace(`${pathname}?${newParams.toString()}`, {
          scroll: false,
        });

        return () => clearTimeout(t);
      }
    }
  }, [searchParams, returnedRows, pathname, router, setRowSelection]);

  const handleClosePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('panel');
    params.delete('id');
    params.delete('animate');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const selectedAsset = useMemo(
    () =>
      assetRows.find(
        (a) => a.assetTag === activeAssetId || a.assetId === activeAssetId
      ) ?? null,
    [assetRows, activeAssetId]
  );

  const handleRowClick = (row: AssetAssignmentRow) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('panel', 'record');
    params.set('id', row.assetTag);
    params.set('animate', isPanelOpen ? '0' : '1');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleReturnedAssetClick = (
    row: AssetAssignmentRow,
    rowIndex: number
  ) => {
    setRowSelection({ [rowIndex]: true });

    setProcessReturnAsset({
      assetId: row.assetId,
      assetTag: row.assetTag,
      assetName: row.assetName,
      assignee: row.assignedTo,
      assignmentId: row.assignmentId,
    });
    setIsProcessReturnModalOpen(true);
  };

  const handleMultiAssignModalOpenChange = (open: boolean) => {
    setIsMultiAssignModalOpen(open);
    if (!open) {
      setMultiAssignAssets([]);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted">
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-background p-6">
          <div className="mb-4 shrink-0">
            <h1
              className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}
            >
              Assignments and Returns
            </h1>
          </div>

          <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
            <ModuleNavigationTabs
              tabs={tabs}
              defaultTab="available-assets"
              onTabChange={() => {
                setRowSelection({});
                if (isPanelOpen) {
                  handleClosePanel();
                }
              }}
              containerClassName="flex flex-1 flex-col overflow-hidden [&>div.mt-4]:flex [&>div.mt-4]:min-h-0 [&>div.mt-4]:flex-1 [&>div.mt-4]:flex-col [&>div.mt-4]:overflow-hidden"
            >
              <TabsContent
                value="available-assets"
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=active]:flex data-[state=inactive]:hidden"
              >
                <AssignmentsTable
                  rows={filteredAvailableRows}
                  columns={columns}
                  selectionActions={selectionActionsAvailable}
                  searchValue={searchValue}
                  onSearchChange={setSearchValue}
                  filterFieldConfigs={filterFieldConfigs}
                  appliedFilters={appliedFilters}
                  onApplyFilter={applyFilter}
                  onClearFilter={clearFilter}
                  onClearAllFilters={clearAllFilters}
                  onRowClick={handleRowClick}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                />
              </TabsContent>

              <TabsContent
                value="assigned-assets"
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=active]:flex data-[state=inactive]:hidden"
              >
                <AssignmentsTable
                  rows={filteredAssignedRows}
                  columns={columns}
                  selectionActions={selectionActionsAssigned}
                  showStatusColumn
                  searchValue={searchValue}
                  onSearchChange={setSearchValue}
                  filterFieldConfigs={filterFieldConfigs}
                  appliedFilters={appliedFilters}
                  onApplyFilter={applyFilter}
                  onClearFilter={clearFilter}
                  onClearAllFilters={clearAllFilters}
                  onRowClick={handleRowClick}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                />
              </TabsContent>

              <TabsContent
                value="returned-assets"
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=active]:flex data-[state=inactive]:hidden"
              >
                <AssignmentsTable
                  rows={filteredReturnedRows}
                  columns={columns}
                  searchValue={searchValue}
                  onSearchChange={setSearchValue}
                  filterFieldConfigs={filterFieldConfigs}
                  appliedFilters={appliedFilters}
                  onApplyFilter={applyFilter}
                  onClearFilter={clearFilter}
                  onClearAllFilters={clearAllFilters}
                  onRowClick={handleReturnedAssetClick}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  disableSelectionHeader
                />
              </TabsContent>
            </ModuleNavigationTabs>
          </div>
        </main>
      </div>

      <AssignmentsPanels
        isOpen={isPanelOpen}
        disableTransition={searchParams.get('animate') === '0'}
        selectedAsset={selectedAsset}
        onClose={handleClosePanel}
      />

      <ProcessReturnModal
        isOpen={isProcessReturnModalOpen}
        asset={processReturnAsset}
        onOpenChange={(open) => {
          setIsProcessReturnModalOpen(open);
          if (!open) {
            setProcessReturnAsset(null);
            setRowSelection({});
          }
        }}
      />

      <MultiAssetAssignmentModal
        isOpen={isMultiAssignModalOpen}
        assets={multiAssignAssets}
        onOpenChange={handleMultiAssignModalOpenChange}
      />
    </div>
  );
}
