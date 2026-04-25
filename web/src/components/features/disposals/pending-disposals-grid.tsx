'use client';

import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/data-table';

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

export function PendingDisposalsGrid({
  initialData,
  onRowClick,
}: PendingDisposalsGridProps) {
  const [searchValue, setSearchValue] = useState('');

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

  const columns = useMemo<ColumnDef<PendingDisposalRow>[]>(
    () => [
      { accessorKey: 'assetTag', header: 'Asset ID' },
      {
        accessorKey: 'assetName',
        header: 'Device Name',
        cell: ({ row }) => row.original.assetName || '-',
      },
      { accessorKey: 'flaggedBy', header: 'Flagged By' },
      { accessorKey: 'reason', header: 'Reason' },
      {
        id: 'daysPending',
        header: 'Days Pending',
        cell: ({ row }) => {
          const days = Math.floor(
            Math.abs(
              new Date().getTime() -
                new Date(row.original.requestedAt).getTime()
            ) /
              (1000 * 60 * 60 * 24)
          );

          // Now mapping to standard design system tokens
          const badgeClass =
            days > 30
              ? 'border-destructive bg-destructive text-destructive-foreground'
              : days >= 1 && days <= 14
                ? 'border-primary/20 bg-primary/10 text-primary' 
                : 'border-border bg-muted text-muted-foreground';

          return (
            <span
              className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-semibold ${badgeClass}`}
            >
              {days} {days === 1 ? 'Day' : 'Days'}
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="relative w-full max-w-[320px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search..."
          className="h-10 rounded-lg border-border bg-background pl-9"
        />
      </div>

      <div className="min-h-0 flex-1">
        <DataTable<PendingDisposalRow, unknown>
          columns={columns}
          data={filteredData}
          initialPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          className="cursor-pointer rounded-xl border border-border bg-background shadow-sm"
          onRowClick={(
            row: { original?: PendingDisposalRow } | PendingDisposalRow
          ) => {
            const rowData =
              'original' in row && row.original
                ? row.original
                : (row as PendingDisposalRow);
            onRowClick(rowData);
          }}
        />
      </div>
    </div>
  );
}