'use client';

import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Search, FileText } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';

export interface HistoryDisposalRow {
  id: number;
  assetTag: string;
  category: string;
  reason: string;
  flaggedBy: string;
  disposedBy: string | null;
  disposalDate: Date | null;
  status: string;
  documentUrl: string | null;
}

interface DisposalHistoryGridProps {
  initialData: HistoryDisposalRow[];
}

function toCellText(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return '-';
  }
  return value;
}

export function DisposalHistoryGrid({ initialData }: DisposalHistoryGridProps) {
  const [searchValue, setSearchValue] = useState('');

  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return initialData;
    const lowerQuery = searchValue.toLowerCase();

    return initialData.filter(
      (row) =>
        row.assetTag.toLowerCase().includes(lowerQuery) ||
        row.category.toLowerCase().includes(lowerQuery) ||
        row.reason.toLowerCase().includes(lowerQuery) ||
        row.flaggedBy.toLowerCase().includes(lowerQuery) ||
        (row.disposedBy?.toLowerCase() || '').includes(lowerQuery)
    );
  }, [initialData, searchValue]);

  const columns = useMemo<ColumnDef<HistoryDisposalRow>[]>(
    () => [
      {
        accessorKey: 'assetTag',
        header: 'Asset ID',
        size: 120,
        minSize: 100,
        maxSize: 150,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        size: 140,
        minSize: 120,
        maxSize: 200,
        cell: ({ row }) => toCellText(row.original.category),
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        size: 200,
        minSize: 150,
        maxSize: 350,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 130,
        minSize: 100,
        maxSize: 160,
        cell: ({ row }) => {
          // Status is either 'Completed' or 'Rejected' mapped to 'disposed' or 'rejected'
          const rawStatus = row.original.status;
          const badgeValue = rawStatus === 'Completed' ? 'disposed' : rawStatus.toLowerCase();
          const displayLabel = rawStatus === 'Completed' ? 'Disposed' : rawStatus;
          
          return (
            <StatusBadge
              value={badgeValue}
              label={displayLabel}
            />
          );
        },
      },
      {
        accessorKey: 'flaggedBy',
        header: 'Flagged By',
        size: 140,
        minSize: 120,
        maxSize: 200,
      },
      {
        accessorKey: 'disposedBy',
        header: 'Reviewed By',
        size: 140,
        minSize: 120,
        maxSize: 200,
        cell: ({ row }) => toCellText(row.original.disposedBy),
      },
      {
        accessorKey: 'disposalDate',
        header: 'Disposal Date',
        size: 130,
        minSize: 120,
        maxSize: 160,
        cell: ({ row }) => {
          if (!row.original.disposalDate) return '-';
          return new Date(row.original.disposalDate).toLocaleDateString();
        },
      },
      {
        id: 'document',
        header: 'Documents',
        size: 120,
        minSize: 100,
        maxSize: 150,
        cell: ({ row }) => {
          if (!row.original.documentUrl) {
            return <span className="text-slate-400 text-sm">-</span>;
          }
          
          // Extract filename from URL if possible
          let filename = 'Document.pdf';
          try {
            const urlObj = new URL(row.original.documentUrl);
            const pathParts = urlObj.pathname.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart.includes('.')) {
              filename = decodeURIComponent(lastPart);
            }
          } catch {
            // ignore
          }

          return (
            <a
              href={row.original.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              <FileText className="h-4 w-4 text-red-500" />
              <span className="truncate text-sm font-medium">{filename}</span>
            </a>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Toolbar (Search Only) */}
      <div className="flex items-center justify-between w-full">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search history..."
            className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Data Table Container */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <DataTable<HistoryDisposalRow, unknown>
          columns={columns}
          data={filteredData}
          initialPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          emptyState={{
            title: 'No disposal history',
            description: 'There are no completed or rejected disposals on record.',
          }}
        />
      </div>
    </div>
  );
}
