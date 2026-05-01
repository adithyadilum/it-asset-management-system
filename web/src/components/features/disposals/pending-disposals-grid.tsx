'use client';

import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';

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
  
  // New states for bulk actions and selection
  const [rowSelection, setRowSelection] = useState({});
  const [isBulkExecuteModalOpen, setIsBulkExecuteModalOpen] = useState(false);
  const [isBulkRejectModalOpen, setIsBulkRejectModalOpen] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return initialData;
    const lowerQuery = searchValue.toLowerCase();

    return initialData.filter(
      (row) =>
        row.assetTag.toLowerCase().includes(lowerQuery) ||
        (row.assetName?.toLowerCase() || '').includes(lowerQuery) ||
        row.flaggedBy.toLowerCase().includes(lowerQuery) ||
        row.reason.toLowerCase().includes(lowerQuery)
    );
  }, [initialData, searchValue]);

  // Derive the actual selected row objects based on the rowSelection state
  const selectedRows = useMemo(() => {
    return filteredData.filter((_, index) => (rowSelection as Record<number, boolean>)[index]);
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
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Toolbar (Search Only) */}
      <div className="flex items-center justify-between w-full">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search assets..."
            className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Data Table Container */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <DataTable<PendingDisposalRow, unknown>
          columns={columns}
          data={filteredData}
          initialPageSize={10}
          pageSizeOptions={[10, 20, 50]}
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