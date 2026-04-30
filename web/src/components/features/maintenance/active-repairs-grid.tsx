'use client';

import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import type { ActiveRepairTicket } from '@/types/maintenance';
import { formatDate, } from '@/lib/date';
import { formatMoneyByCurrency } from '@/lib/currency';
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
      header: ({ column }) => {
        const sortState = column.getIsSorted();
        const ariaSort = sortState === 'asc' ? 'ascending' : sortState === 'desc' ? 'descending' : 'none';
        
        return (
          <div
            role="button"
            tabIndex={0}
            aria-sort={ariaSort}
            aria-label={`Sort by Estimated Return Date. Current sort: ${ariaSort}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                column.toggleSorting(column.getIsSorted() === 'asc');
              }
            }}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-slate-900 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-sm px-1 -ml-1"
          >
            Est. Return Date
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
          </div>
        );
      },
      cell: ({ row }) => (
        <span className="text-slate-600">
          {formatDate(row.original.estimatedReturnDate)}
        </span>
      ),
    },
    {
      accessorKey: 'estimatedCost',
      header: ({ column }) => {
        const sortState = column.getIsSorted();
        const ariaSort = sortState === 'asc' ? 'ascending' : sortState === 'desc' ? 'descending' : 'none';

        return (
          <div
            role="button"
            tabIndex={0}
            aria-sort={ariaSort}
            aria-label={`Sort by Estimated Cost. Current sort: ${ariaSort}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                column.toggleSorting(column.getIsSorted() === 'asc');
              }
            }}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-slate-900 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-sm px-1 -ml-1"
          >
            Est. Cost.
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
          </div>
        );
      },
      cell: ({ row }) => (
        <span className="text-slate-600">
          {formatMoneyByCurrency(row.original.estimatedCost, 'USD')}
        </span>
      ),
    },
  ];

 if (isLoading) {
  return (
    <TableSkeleton
      rowCount={5}
      columnWidths={['w-[15%]', 'w-[20%]', 'w-[20%]', 'w-[25%]', 'w-[20%]']}
    />
  );
}

if (tickets.length === 0) {
  return (
     <div className="flex h-32 items-center justify-center bg-slate-50">
      <span className="text-sm text-slate-500">No active repairs found</span>
    </div>
  );
}

return (
  <DataTable
    columns={activeRepairsColumns}
    data={tickets}
    pageSizeOptions={[10, 20, 30, 50]}
    initialPageSize={10}
    onRowClick={(row) => onRowClick(row)}
    enableRowSelection={false} 
    enableRowScroll={true} 
    className="border-0 h-full flex-1" 
  />
);
}