'use client';

import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import type { ActiveRepairTicket } from '@/types/maintenance';
import { formatDate } from '@/lib/date';
import { formatMoneyByCurrency } from '@/lib/currency';
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
      header: 'Est. Return Date',
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
          {formatDate(row.original.estimatedReturnDate)}
        </span>
      ),
    },
    {
      accessorKey: 'estimatedCost',
      header: 'Est. Cost.',
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

  return (
    <DataTable
      columns={activeRepairsColumns}
      data={tickets}
      pageSizeOptions={[10, 20, 30, 50]}
      initialPageSize={10}
      onRowClick={(row) => onRowClick(row)}
      enableRowSelection={false}
      enableRowScroll={true}
      className="border-0 flex-1 min-h-0"
      emptyState={{
        title: 'No active repairs found',
        description: 'New repair tickets will appear here once assets are sent for maintenance.',
      }}
    />
  );
}