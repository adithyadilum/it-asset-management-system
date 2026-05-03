'use client';

import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import type { ActiveRepairTicket } from '@/types/maintenance';
import { formatDate } from '@/lib/date';
import { formatMoneyByCurrency } from '@/lib/currency';
import { ArrowUpDown } from 'lucide-react';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

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
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>{row.original.asset.assetTag}</span>
      ),
    },
    {
      accessorKey: 'vendorName',
      header: 'Vendor',
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{row.original.vendorName || 'N/A'}</span>,
    },
    {
      accessorKey: 'rmaNumber',
      header: 'RMA Ticket #',
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{row.original.rmaNumber || 'N/A'}</span>
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
            aria-label={`Sort by Estimated Return Date. Current sort: ${ariaSort}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                column.toggleSorting(column.getIsSorted() === 'asc');
              }
            }}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className={`flex items-center gap-2 hover:text-foreground cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1 -ml-1 ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}
          >
            Est. Return Date
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </div>
        );
      },
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
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
            aria-label={`Sort by Estimated Cost. Current sort: ${ariaSort}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                column.toggleSorting(column.getIsSorted() === 'asc');
              }
            }}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className={`flex items-center gap-2 hover:text-foreground cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1 -ml-1 ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}
          >
            Est. Cost.
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </div>
        );
      },
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
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
     <div className="flex h-32 items-center justify-center bg-muted/30">
      <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>No active repairs found</span>
    </div>
  );
}

return (
  <div className="flex flex-col h-full overflow-hidden">
    <DataTable
      columns={activeRepairsColumns}
      data={tickets}
      pageSizeOptions={[10, 20, 30, 50]}
      initialPageSize={10}
      onRowClick={(row) => onRowClick(row)}
      enableRowSelection={false} 
      enableRowScroll={true} 
      className="border-0 flex-1 min-h-0" 
    />
  </div>
);
}