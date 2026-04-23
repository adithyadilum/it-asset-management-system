// web/src/components/features/maintenance/active-repairs-grid.tsx
'use client';

import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import type { ActiveRepairTicket } from '@/types/maintenance';
import { format } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';

interface ActiveRepairsGridProps {
  tickets: ActiveRepairTicket[];
  isLoading: boolean;
  onRowClick: (ticket: ActiveRepairTicket) => void;
}

export function ActiveRepairsGrid({
  tickets,
  isLoading,
  onRowClick,
}: ActiveRepairsGridProps) {
  
  const activeRepairsColumns: ColumnDef<ActiveRepairTicket>[] = [
    {
      accessorKey: 'asset.assetTag',
      header: 'Asset ID',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900">{row.original.asset.assetTag}</span>
      ),
    },
    {
      accessorKey: 'vendorName',
      header: 'Vendor',
      cell: ({ row }) => <span className="text-slate-600">{row.original.vendorName || 'N/A'}</span>,
    },
    {
      accessorKey: 'rmaNumber',
      header: 'RMA Ticket #',
      cell: ({ row }) => (
        <span className="text-slate-600">{row.original.rmaNumber || 'N/A'}</span>
      ),
    },
    {
      accessorKey: 'estimatedReturnDate',
      header: ({ column }) => (
        // Changed from <button> to <div role="button"> to fix hydration error!
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-2 hover:text-slate-900 cursor-pointer select-none"
        >
          Est. Return Date
          <ArrowUpDown className="h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-slate-600">
          {row.original.estimatedReturnDate
            ? format(new Date(row.original.estimatedReturnDate), 'MM/dd/yyyy')
            : 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'estimatedCost',
      header: ({ column }) => (
        // Changed from <button> to <div role="button"> to fix hydration error!
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-2 hover:text-slate-900 cursor-pointer select-none"
        >
          Est. Cost.
          <ArrowUpDown className="h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-slate-600">
          {row.original.estimatedCost
            ? `$${parseFloat(row.original.estimatedCost).toFixed(0)}`
            : 'N/A'}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return <TableSkeleton rowCount={5} columnWidths={['w-[15%]', 'w-[20%]', 'w-[20%]', 'w-[25%]', 'w-[20%]']} />;
  }

  return (
    <DataTable
      columns={activeRepairsColumns}
      data={tickets}
      pageSizeOptions={[10, 20, 30, 50]}
      initialPageSize={10}
      onRowClick={(row) => onRowClick(row)}
    />
  );
}