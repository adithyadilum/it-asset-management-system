'use client';

import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import type { RepairHistoryTicket } from '@/types/maintenance';
import { formatDate } from '@/lib/date';
import { formatMoneyByCurrency } from '@/lib/currency'; 
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

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
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>{row.original.assetId}</span>
      ),
    },
    {
      accessorKey: 'vendorName',
      header: 'Vendor',
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{row.original.vendorName || 'Internal'}</span>,
    },
    {
      accessorKey: 'actualCompletionDate',
      header: 'Resolution Date',
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
          {formatDate(row.original.actualCompletionDate)}
        </span>
      ),
    },
    {
      accessorKey: 'actualCost',
      header: 'Final Cost',
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
          {formatMoneyByCurrency(row.original.actualCost, 'USD')}
        </span>
      ),
    },
    {
      accessorKey: 'resolutionNotes',
      header: 'Notes',
      cell: ({ row }) => (
        <span className={`truncate max-w-xs ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
          {row.original.resolutionNotes || 'N/A'}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return <TableSkeleton rowCount={5} columnWidths={['w-[15%]', 'w-[20%]', 'w-[20%]', 'w-[15%]', 'w-[30%]']} />;
  }

  return (
    <DataTable
      columns={repairHistoryColumns}
      data={tickets}
      pageSizeOptions={[10, 20, 30, 50]}
      initialPageSize={10}
      enableRowSelection={false}
      enableRowScroll={true}
      className="border-0 flex-1 min-h-0"
      emptyState={{
        title: 'No repair history found',
        description: 'Completed maintenance tickets will be archived here.',
      }}
    />
  );
}