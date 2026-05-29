'use client';

import { useState, useMemo } from 'react';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';

import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { FilterBar, type AppliedFilter, type FilterFieldConfig } from '@/components/shared/filter-bar';

// Import our new unified dialogs
import { ExecuteDisposalDialog } from './execute-disposal-dialog';
import { RejectDisposalDialog } from './reject-disposal-dialog';

export interface PendingDisposalRow {
  id: number;
  assetId: string;
  assetTag: string;
  assetName: string | null;
  flaggedBy: string;
  reason: string;
  requestedAt: Date;
}

interface PendingDisposalsGridProps {
  initialData: PendingDisposalRow[];
  onRowClick: (row: PendingDisposalRow) => void;
}

function toCellText(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return '-';
  }
  return value;
}

function calculateDaysPending(requestedAt: Date): number {
  return Math.floor(
    Math.abs(new Date().getTime() - new Date(requestedAt).getTime()) /
    (1000 * 60 * 60 * 24)
  );
}

function getDaysPendingStatus(
  days: number
): 'critical' | 'warning' | 'neutral' {
  if (days > 30) {
    return 'critical';
  }
  if (days >= 1 && days <= 14) {
    return 'warning';
  }
  return 'neutral';
}

export function PendingDisposalsGrid({
  initialData,
  onRowClick,
}: PendingDisposalsGridProps) {
  const [searchValue, setSearchValue] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkExecuteModalOpen, setIsBulkExecuteModalOpen] = useState(false);
  const [isBulkRejectModalOpen, setIsBulkRejectModalOpen] = useState(false);

  const filterFieldConfigs: FilterFieldConfig[] = [
    { value: 'assetTag', label: 'Asset ID' },
    { value: 'assetName', label: 'Asset Name' },
    { value: 'flaggedBy', label: 'Flagged By' },
    { value: 'reason', label: 'Reason' },
  ];

  const applyFilter = (filter: AppliedFilter) => {
    setAppliedFilters((prev) => {
      const filtered = prev.filter((f) => f.field !== filter.field);
      return [...filtered, filter];
    });
  };

  const clearFilter = (field: string) => {
    setAppliedFilters((prev) => prev.filter((f) => f.field !== field));
  };

  const clearAllFilters = () => setAppliedFilters([]);

  const filteredData = useMemo(() => {
    let result = [...initialData];

    // 1. Search
    if (searchValue.trim()) {
      const lowerQuery = searchValue.toLowerCase();
      result = result.filter(
        (row) =>
          row.assetTag.toLowerCase().includes(lowerQuery) ||
          (row.assetName?.toLowerCase() || '').includes(lowerQuery) ||
          row.flaggedBy.toLowerCase().includes(lowerQuery) ||
          row.reason.toLowerCase().includes(lowerQuery)
      );
    }

    // 2. Filters
    appliedFilters.forEach((filter) => {
      const { field, operator, value } = filter;
      const lowerValue = value.toLowerCase();

      result = result.filter((row) => {
        let fieldValue = '';
        if (field === 'assetTag') fieldValue = row.assetTag;
        else if (field === 'assetName') fieldValue = row.assetName || '';
        else if (field === 'flaggedBy') fieldValue = row.flaggedBy;
        else if (field === 'reason') fieldValue = row.reason;

        const isMatch = fieldValue.toLowerCase().includes(lowerValue);
        return operator === 'is' ? isMatch : !isMatch;
      });
    });

    return result;
  }, [initialData, searchValue, appliedFilters]);

  // Derive the actual selected row objects based on the rowSelection state
  const selectedRows = useMemo(() => {
    // Extract the selected keys (TanStack stores selection state as {"0": true, "2": true})
    const selectedKeys = Object.keys(rowSelection).filter((key) => rowSelection[key]);

    //Map those stringified keys back to the original filteredData array
    return selectedKeys
      .map((key) => filteredData[parseInt(key, 10)])
      .filter((row) => row !== undefined); // Safety filter to ensure no undefined rows are passed
  }, [rowSelection, filteredData]);

  const columns = useMemo<ColumnDef<PendingDisposalRow>[]>(
    () => [
      {
        accessorKey: 'assetTag',
        header: 'Asset ID',
        size: 120,
        minSize: 100,
        maxSize: 150,
      },
      {
        accessorKey: 'assetName',
        header: 'Device Name',
        size: 200,
        minSize: 150,
        maxSize: 300,
        cell: ({ row }) => toCellText(row.original.assetName),
      },
      {
        accessorKey: 'flaggedBy',
        header: 'Flagged By',
        size: 150,
        minSize: 120,
        maxSize: 200,
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        size: 200,
        minSize: 150,
        maxSize: 350,
      },
      {
        id: 'daysPending',
        header: 'Days Pending',
        size: 140,
        minSize: 120,
        maxSize: 160,
        cell: ({ row }) => {
          const days = calculateDaysPending(row.original.requestedAt);
          const status = getDaysPendingStatus(days);

          return (
            <StatusBadge
              value={status}
              label={`${days} ${days === 1 ? 'Day' : 'Days'}`}
            />
          );
        },
      },
    ],
    []
  );

  return (
    <div className="flex flex-1 flex-col min-h-0 gap-4">
      {/* Toolbar (Standardized) */}
      <FilterBar
        searchQuery={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search pending disposals..."
        fields={filterFieldConfigs}
        appliedFilters={appliedFilters}
        onApplyFilter={applyFilter}
        onClearFilter={clearFilter}
        onClearAllFilters={clearAllFilters}
      />

      {/* Data Table Container */}
      <div className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-lg bg-background">
        <DataTable<PendingDisposalRow, unknown>
          columns={columns}
          data={filteredData}
          initialPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          className="rounded-lg border-border"
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}

          selectionLabel={(count) => `${count} Assets Selected`}

          selectionActions={[

            {
              id: 'cancel',
              label: 'Cancel',
              tone: 'secondary',
              onClick: () => setRowSelection({}), // Immediately clears all checkboxes!
            },
            {
              id: 'reject',
              label: 'Reject Selected',
              tone: 'secondary',
              onClick: () => setIsBulkRejectModalOpen(true),
            },
            {
              id: 'dispose',
              label: 'Dispose Selected',
              tone: 'destructive',
              onClick: () => setIsBulkExecuteModalOpen(true),
            },
          ]}

          onRowClick={(
            row: { original?: PendingDisposalRow } | PendingDisposalRow
          ) => {
            const rowData =
              'original' in row && row.original
                ? row.original
                : (row as PendingDisposalRow);
            onRowClick(rowData);
          }}
          emptyState={{
            title: 'No pending disposals',
            description: 'There are no disposal requests awaiting review.',
          }}
        />
      </div>

      {/* Render our new Unified Dialogs */}
      <RejectDisposalDialog
        isOpen={isBulkRejectModalOpen}
        onOpenChange={setIsBulkRejectModalOpen}
        selectedAssets={selectedRows}
        onSuccess={() => {
          setIsBulkRejectModalOpen(false);
          setRowSelection({}); // Clear checkboxes after success
        }}
      />

      <ExecuteDisposalDialog
        isOpen={isBulkExecuteModalOpen}
        onOpenChange={setIsBulkExecuteModalOpen}
        selectedAssets={selectedRows}
        onSuccess={() => {
          setIsBulkExecuteModalOpen(false);
          setRowSelection({}); // Clear checkboxes after success
        }}
      />
    </div>
  );
}