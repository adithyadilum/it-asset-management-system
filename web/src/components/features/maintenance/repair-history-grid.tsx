'use client';

import { useState } from 'react';
import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import type { RepairHistoryTicket } from '@/types/maintenance';
import { formatDate } from '@/lib/date';
import { formatMoneyByCurrency } from '@/lib/currency'; 
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

// 🚨 NEW: Expandable Text Cell Component
const ExpandableText = ({ text, defaultWidthClass }: { text: string; defaultWidthClass: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text || text === 'N/A') {
    return <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>N/A</span>;
  }
  
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}
      className={`cursor-pointer hover:text-foreground transition-colors ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground ${
        isExpanded ? 'whitespace-nowrap' : `truncate block ${defaultWidthClass}`
      }`}
      title={isExpanded ? "Click to collapse" : "Click to expand"}
    >
      {text}
    </div>
  );
};

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
      // 🚨 UPDATED: Using ExpandableText for the notes column
      cell: ({ row }) => <ExpandableText text={row.original.resolutionNotes || 'N/A'} defaultWidthClass="w-[250px]" />
    },
  ];

  if (isLoading) {
    return <TableSkeleton rowCount={5} columnWidths={['w-[15%]', 'w-[20%]', 'w-[20%]', 'w-[15%]', 'w-[30%]']} />;
  }

  if (tickets.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center bg-muted/30">
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>No repair history found</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DataTable
        columns={repairHistoryColumns}
        data={tickets}
        pageSizeOptions={[10, 20, 30, 50]}
        initialPageSize={10}
        enableRowSelection={false} 
        enableRowScroll={true} 
        className="border-0 flex-1 min-h-0" 
      />
    </div>
  );
}