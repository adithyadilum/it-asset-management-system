'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/shared/status-badge';
import type { AssetAssignmentRow } from './assignments-table';

const PILLAR_LABELS: Record<string, string> = {
  Hardware: 'Hardware',
  Software: 'Software',
  'Office Furniture': 'Furniture & Fixtures',
  'Office Electronics': 'Office Electronics',
};

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
    accessorKey: 'group',
    header: 'Pillar',
    cell: ({ row }) => {
      const label = PILLAR_LABELS[row.original.group] ?? row.original.group;
      return <StatusBadge variant="metadata" label={label} />;
    },
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
    // `metadata` is StatusBadge's neutral variant — same shape as every other
    // badge, without implying a status.
    cell: ({ row }) => (
      <StatusBadge variant="metadata" label={row.original.category} />
    ),
  },
  {
    accessorKey: 'state',
    header: 'Status',
    // Was a bespoke pill with its own colour map, which is why assignment
    // statuses looked unlike every other badge in the app. StatusBadge carries
    // the label and colour for each assignment state.
    cell: ({ row }) => <StatusBadge value={row.original.state} showIcon />,
  },
];
