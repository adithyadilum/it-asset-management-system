'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { Search, FileText } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { useDebounce } from '@/hooks/use-debounce';

export interface HistoryDisposalRow {
  id: number;
  assetId: string;
  assetTag: string;
  category: string;
  reason: string;
  flaggedBy: string;
  disposedBy: string | null;
  disposalDate: Date | null;
  status: string;
  documentUrls: string[];
}

interface DisposalHistoryGridProps {
  initialData: HistoryDisposalRow[];
  pageCount?: number;
  currentPage?: number;
  pageSize?: number;
  searchQuery?: string;
  onRowClick?: (row: HistoryDisposalRow) => void;
}

function toCellText(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return '-';
  }
  return value;
}

export function DisposalHistoryGrid({ 
  initialData, 
  pageCount = 1,
  currentPage = 1,
  pageSize = 10,
  searchQuery = '',
  onRowClick,
}: DisposalHistoryGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 500);

  // Sync search changes to URL
  useEffect(() => {
    if (debouncedSearch === searchQuery) return;
    
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
      params.set('page', '1'); // Reset to page 1 on new search
    } else {
      params.delete('search');
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [debouncedSearch, pathname, router, searchParams, searchQuery]);

  const paginationState = useMemo<PaginationState>(
    () => ({
      pageIndex: currentPage - 1,
      pageSize,
    }),
    [currentPage, pageSize]
  );

  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const nextState =
        typeof updater === 'function' ? updater(paginationState) : updater;

      const params = new URLSearchParams(searchParams.toString());
      params.set('page', (nextState.pageIndex + 1).toString());
      params.set('pageSize', nextState.pageSize.toString());

      router.push(`${pathname}?${params.toString()}`);
    },
    [paginationState, pathname, router, searchParams]
  );

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
        accessorKey: 'documentUrls',
        header: 'Documents',
        size: 160,
        minSize: 120,
        maxSize: 250,
        cell: ({ row }) => {
          const urls = row.original.documentUrls || [];
          if (urls.length === 0) {
            return <span className="text-slate-400 text-sm">-</span>;
          }
          
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {urls.map((url, index) => {
                let filename = `Document ${index + 1}`;
                try {
                  const urlObj = new URL(url);
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
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-red-500" />
                    <span className="truncate text-sm font-medium" title={filename}>{filename}</span>
                  </a>
                );
              })}
            </div>
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
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search history..."
            className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Data Table Container */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <DataTable<HistoryDisposalRow, unknown>
          columns={columns}
          data={initialData}
          manualPagination={true}
          pageCount={pageCount}
          paginationState={paginationState}
          onPaginationChange={handlePaginationChange}
          pageSizeOptions={[10, 20, 50]}
          onRowClick={(
            row: { original?: HistoryDisposalRow } | HistoryDisposalRow
          ) => {
            if (!onRowClick) return;
            const rowData =
              'original' in row && row.original
                ? row.original
                : (row as HistoryDisposalRow);
            onRowClick(rowData);
          }}
          emptyState={{
            title: 'No disposal history',
            description: 'There are no completed or rejected disposals on record.',
          }}
        />
      </div>
    </div>
  );
}
