'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { FileText } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { useDebounce } from '@/hooks/use-debounce';
import {
  FilterBar,
  type AppliedFilter,
  type FilterFieldConfig,
} from '@/components/shared/filter-bar';
import type { HistoryDisposalRow } from '@/types/disposals';

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
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const debouncedSearch = useDebounce(localSearch, 500);

  const filterFieldConfigs: FilterFieldConfig[] = [
    { value: 'assetTag', label: 'Asset ID' },
    { value: 'category', label: 'Category' },
    { value: 'reason', label: 'Reason' },
    { value: 'flaggedBy', label: 'Flagged By' },
  ];

  const applyFilter = (filter: AppliedFilter) => {
    setAppliedFilters((prev) => {
      const filtered = prev.filter((f) => f.field !== filter.field);
      return [...filtered, filter];
    });
  };

  const clearFilter = (field: string) => {
    setAppliedFilters((prev) => prev.filter((f) => f.field !== field));
  };

  const clearAllFilters = () => setAppliedFilters([]);

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

  // Client-side filtering for applied filters (on top of server-side search)
  const filteredData = useMemo(() => {
    let result = [...initialData];

    appliedFilters.forEach((filter) => {
      const { field, operator, value } = filter;
      const lowerValue = value.toLowerCase();

      result = result.filter((row) => {
        let fieldValue = '';
        if (field === 'assetTag') fieldValue = row.assetTag;
        else if (field === 'category') fieldValue = row.category;
        else if (field === 'reason') fieldValue = row.reason;
        else if (field === 'flaggedBy') fieldValue = row.flaggedBy;

        const isMatch = fieldValue.toLowerCase().includes(lowerValue);
        return operator === 'is' ? isMatch : !isMatch;
      });
    });

    return result;
  }, [initialData, appliedFilters]);

  const paginationState = useMemo<PaginationState>(
    () => ({
      pageIndex: currentPage - 1,
      pageSize,
    }),
    [currentPage, pageSize]
  );

  const handlePaginationChange = useCallback(
    (
      updater: PaginationState | ((old: PaginationState) => PaginationState)
    ) => {
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
          const badgeValue =
            rawStatus === 'Completed' ? 'disposed' : rawStatus.toLowerCase();
          const displayLabel =
            rawStatus === 'Completed' ? 'Disposed' : rawStatus;

          return <StatusBadge value={badgeValue} label={displayLabel} />;
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
            return <span className="text-muted-foreground text-sm">-</span>;
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
                    <span
                      className="truncate text-sm font-medium"
                      title={filename}
                    >
                      {filename}
                    </span>
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
      {/* Toolbar (Standardized) */}
      <FilterBar
        searchQuery={localSearch}
        onSearchChange={setLocalSearch}
        searchPlaceholder="Search history..."
        fields={filterFieldConfigs}
        appliedFilters={appliedFilters}
        onApplyFilter={applyFilter}
        onClearFilter={clearFilter}
        onClearAllFilters={clearAllFilters}
      />

      {/* Data Table Container */}
      <div className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-lg bg-background">
        <DataTable<HistoryDisposalRow, unknown>
          columns={columns}
          data={filteredData}
          manualPagination={true}
          pageCount={pageCount}
          paginationState={paginationState}
          onPaginationChange={handlePaginationChange}
          pageSizeOptions={[10, 20, 50]}
          className="rounded-lg border-border"
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
            description:
              'There are no completed or rejected disposals on record.',
          }}
        />
      </div>
    </div>
  );
}
