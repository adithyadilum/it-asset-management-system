// web/src/components/features/maintenance/repair-history-grid.tsx
'use client';

import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import type { RepairHistoryTicket } from '@/types/maintenance';
import { format } from 'date-fns';

interface RepairHistoryGridProps {
  tickets: RepairHistoryTicket[];
  isLoading: boolean;
}

export function RepairHistoryGrid({
  tickets,
  isLoading,
}: RepairHistoryGridProps) {
  const repairHistoryColumns: ColumnDef<RepairHistoryTicket>[] = [
    {
      accessorKey: 'assetId',
      header: 'Asset ID',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900">{row.original.assetId}</span>
      ),
    },
    {
      accessorKey: 'vendorName',
      header: 'Vendor',
      cell: ({ row }) => <span className="text-slate-600">{row.original.vendorName || 'Internal'}</span>,
    },
    {
      accessorKey: 'actualCompletionDate',
      header: 'Resolution Date',
      cell: ({ row }) => (
        <span className="text-slate-600">
          {row.original.actualCompletionDate
            ? format(new Date(row.original.actualCompletionDate), 'MM/dd/yyyy')
            : 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'actualCost',
      header: 'Final Cost',
      cell: ({ row }) => (
        <span className="text-slate-600">
          {row.original.actualCost
            ? `$${parseFloat(row.original.actualCost).toFixed(0)}`
            : 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'resolutionNotes',
      header: 'Notes',
      cell: ({ row }) => (
        <span className="truncate max-w-xs text-slate-600">
          {row.original.resolutionNotes || 'N/A'}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return <TableSkeleton rowCount={5} columnWidths={['w-[15%]', 'w-[20%]', 'w-[20%]', 'w-[15%]', 'w-[30%]']} />;
  }

  if (tickets.length === 0) {
  return (
    <div className="flex h-32 items-center justify-center bg-slate-50">
      <span className="text-sm text-slate-500">No repair history found</span>
    </div>
  );
}

  return (
  <DataTable
    columns={repairHistoryColumns}
    data={tickets}
    pageSizeOptions={[10, 20, 30, 50]}
    initialPageSize={10}
    enableRowSelection={false} 
    enableRowScroll={true} 
    className="border-0 h-full flex-1" 
  />
);
}