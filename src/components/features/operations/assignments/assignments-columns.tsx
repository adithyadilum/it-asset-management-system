'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { AssetAssignmentRow } from './assignments-table';

export const getAssignmentColumns = (): ColumnDef<AssetAssignmentRow>[] => [
  {
    accessorKey: 'assetId',
    header: 'Asset ID',
    cell: ({ row }) => (
      <span className="font-medium text-foreground">
        {row.original.assetTag}
      </span>
    ),
  },
  {
    accessorKey: 'assetName',
    header: 'Asset Name',
  },
  {
    accessorKey: 'serialNumber',
    header: 'Serial Number',
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono">
        {row.original.serialNumber}
      </span>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="h-5 rounded-full border-border bg-muted px-2 text-[11px] font-medium text-muted-foreground"
      >
        {row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: 'state',
    header: 'Status',
    cell: ({ row }) => {
      const state = row.original.state;
      const colors: Record<string, string> = {
        'pending approval': 'bg-amber-50 text-amber-700 border-amber-200',
        assigned: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        overdue: 'bg-rose-50 text-rose-700 border-rose-200',
        requested: 'bg-blue-50 text-blue-700 border-blue-200',
        returned: 'bg-muted text-foreground border-border',
      };
      const colorClass =
        colors[state] || 'bg-muted text-foreground border-border';

      return (
        <Badge
          variant="outline"
          className={`h-5 rounded-full px-2 text-[11px] font-medium capitalize ${colorClass}`}
        >
          {state}
        </Badge>
      );
    },
  },
];
