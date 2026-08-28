'use client';

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  useCallback,
  useRef,
} from 'react';
import { format } from 'date-fns';
import { Download } from 'lucide-react';

import {
  AUDIT_EXPORT_LIMIT,
  exportAuditLogs,
  getAuditLogs,
  type AuditLogRow,
  type PaginatedAuditLogsResult,
} from '@/actions/audit-log';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PaginationState } from '@tanstack/react-table';

import {
  buildEventDetailsSentence,
  humanizeFieldName,
} from '@/lib/audit-events';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import {
  FilterBar,
  type AppliedFilter,
  type FilterFieldConfig,
} from '@/components/shared/filter-bar';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { ColumnDef } from '@tanstack/react-table';

type AuditFilterField =
  'Action Taken' | 'Target Entity' | 'User' | 'IP Address' | 'Event Details';

type AuditLogClientProps = {
  initialResult?: PaginatedAuditLogsResult;
};

const FILTER_FIELDS: AuditFilterField[] = [
  'Action Taken',
  'Target Entity',
  'User',
  'IP Address',
  'Event Details',
];

const ACTION_BADGE_STYLES: Record<string, string> = {
  CREATE:
    'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
  UPDATE:
    'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400',
  DELETE:
    'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400',
  DISPOSE:
    'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400',
  DISPOSED:
    'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400',
  EXPORTED:
    'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
  LOGIN:
    'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400',
  LOGOUT:
    'border-border bg-muted text-foreground dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400',
  ACCESS_DENIED:
    'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400',
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatAuditTimestamp(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Row description, shared with the dashboard feed, the asset history
 * timeline and the mobile activity endpoint. This file used to carry its own
 * copy; they had drifted apart, and only this one knew about ACCESS_DENIED.
 */
function buildEventDetails(row: AuditLogRow) {
  return buildEventDetailsSentence(
    row.actionType,
    row.entityType,
    row.oldValue,
    row.newValue
  );
}

function buildTargetEntity(row: AuditLogRow) {
  if (row.entityLabel && row.entityLabel.trim().length > 0) {
    return row.entityLabel;
  }

  return `${humanizeFieldName(row.entityType)}: ${row.entityId}`;
}

function TruncatedTextWithTooltip({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    // Only wrap the cell when the content actually overflows.
    const checkTruncation = () => {
      const element = ref.current;
      if (element) {
        setIsTruncated(element.scrollWidth > element.clientWidth);
      }
    };

    const timeoutId = window.setTimeout(checkTruncation, 0);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(checkTruncation)
        : null;

    checkTruncation();
    resizeObserver?.observe(ref.current);
    window.addEventListener('resize', checkTruncation);

    return () => {
      window.clearTimeout(timeoutId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', checkTruncation);
    };
  }, [text]);

  const textNode = (
    <span
      ref={ref}
      className="block w-full min-w-0 truncate text-sm"
      style={{ cursor: isTruncated ? 'help' : 'default' }}
    >
      {text}
    </span>
  );

  if (!isTruncated) {
    return textNode;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{textNode}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-96 wrap-break-word">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: AuditLogRow[]) {
  const header = [
    'Timestamp',
    'User',
    'Action Taken',
    'Target Entity',
    'Event Details',
    'IP Address',
  ];

  const csvRows = rows.map((row) => {
    const user = row.performedBy
      ? `${row.performedBy.name} <${row.performedBy.email}>`
      : 'Unknown';

    return [
      formatAuditTimestamp(row.performedAt),
      user,
      row.actionType,
      buildTargetEntity(row),
      buildEventDetails(row),
      row.ipAddress ?? '-',
    ].map((value) => escapeCsvValue(value));
  });

  const csv = [
    header.map(escapeCsvValue).join(','),
    ...csvRows.map((row) => row.join(',')),
  ].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `system-audit-log-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogClient({ initialResult }: AuditLogClientProps) {
  const [rows, setRows] = useState<AuditLogRow[]>(initialResult?.data ?? []);
  const [meta, setMeta] = useState(
    initialResult?.meta ?? { total: 0, page: 1, pageSize: 16, totalPages: 1 }
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: (initialResult?.meta?.page ?? 1) - 1,
    pageSize: initialResult?.meta?.pageSize ?? 16,
  });

  const [searchValue, setSearchValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);

  const [isPending, startTransition] = useTransition();
  const canReuseInitialResultRef = useRef(Boolean(initialResult));

  // Debounce search so we only query the server after the user pauses typing.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(searchValue.trim().toLowerCase());
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [searchValue]);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'page' | 'recent' | 'range'>(
    'recent'
  );
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (exportScope === 'page') {
      downloadCsv(rows);
      setExportOpen(false);
      return;
    }

    setIsExporting(true);
    try {
      // The filters and search currently on screen are carried through, so the
      // export matches what the user is looking at rather than the whole table.
      const result = await exportAuditLogs({
        search: debouncedQuery,
        filters: appliedFilters,
        ...(exportScope === 'range'
          ? { dateFrom: exportFrom || undefined, dateTo: exportTo || undefined }
          : {}),
      });

      downloadCsv(result.rows);

      if (result.truncated) {
        toast.warning(
          `Exported the most recent ${AUDIT_EXPORT_LIMIT.toLocaleString()} records. Narrow the date range to capture the rest.`
        );
      }
      setExportOpen(false);
    } catch {
      toast.error('Failed to export the audit log.');
    } finally {
      setIsExporting(false);
    }
  }, [exportScope, exportFrom, exportTo, rows, debouncedQuery, appliedFilters]);

  const loadRows = useCallback(async () => {
    try {
      const result = await getAuditLogs({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedQuery,
        filters: appliedFilters,
      });
      setRows(result.data);
      setMeta(result.meta);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    debouncedQuery,
    appliedFilters,
  ]);

  // Reload whenever paging, search, or filters change.
  useEffect(() => {
    const matchesInitialRequest =
      pagination.pageIndex === 0 &&
      pagination.pageSize === (initialResult?.meta.pageSize ?? 16) &&
      debouncedQuery === '' &&
      appliedFilters.length === 0;

    if (matchesInitialRequest && canReuseInitialResultRef.current) {
      return;
    }
    if (!matchesInitialRequest) {
      canReuseInitialResultRef.current = false;
    }

    startTransition(() => {
      loadRows();
    });
  }, [
    appliedFilters.length,
    debouncedQuery,
    initialResult?.meta.pageSize,
    loadRows,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  const setOrReplaceFilter = (nextFilter: AppliedFilter) => {
    setAppliedFilters((currentFilters) => {
      const remainingFilters = currentFilters.filter(
        (filter) => filter.field !== nextFilter.field
      );

      return [...remainingFilters, nextFilter];
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const clearFilter = (field: string) => {
    setAppliedFilters((currentFilters) =>
      currentFilters.filter((filter) => filter.field !== field)
    );
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const clearAllFilters = () => {
    setAppliedFilters([]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const filterFieldConfigs: FilterFieldConfig[] = useMemo(() => {
    return FILTER_FIELDS.map((field) => {
      if (field === 'Action Taken') {
        return {
          value: field,
          label: field,
          options: Object.keys(ACTION_BADGE_STYLES),
        };
      }
      // Free-text input for all other fields
      return { value: field, label: field };
    });
  }, []);

  const tableColumns = useMemo<ColumnDef<AuditLogRow>[]>(
    () => [
      {
        accessorKey: 'performedAt',
        header: 'Timestamp',
        size: 180,
        minSize: 180,
        maxSize: 220,
        cell: ({ row }) => formatAuditTimestamp(row.original.performedAt),
      },
      {
        id: 'performedBy',
        header: 'User',
        size: 260,
        minSize: 220,
        maxSize: 320,
        meta: { noTruncate: true },
        cell: ({ row }) => {
          const performedBy = row.original.performedBy;

          return (
            <div className="flex min-w-0 items-center gap-3 py-0.5">
              <Avatar className="size-7 rounded-md">
                <AvatarImage
                  src={performedBy?.avatarUrl ?? undefined}
                  alt={performedBy?.name ?? 'Unknown'}
                />
                <AvatarFallback className="rounded-md bg-muted text-xs font-semibold text-foreground">
                  {getInitials(performedBy?.name ?? '?')}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-5 text-foreground">
                  {performedBy?.name ?? 'Unknown'}
                </p>
                <p className="truncate text-xs leading-4 text-muted-foreground">
                  {performedBy?.email ?? 'Unknown'}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'actionType',
        header: 'Action Taken',
        size: 150,
        minSize: 140,
        maxSize: 180,
        cell: ({ row }) => {
          const action = row.original.actionType.trim().toUpperCase();
          const actionClassName =
            ACTION_BADGE_STYLES[action] ??
            'border-border bg-muted text-foreground dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400';

          return (
            <Badge
              variant="outline"
              className={cn(
                'h-5 rounded-full px-2 text-[11px] font-semibold tracking-wide',
                actionClassName
              )}
            >
              {action}
            </Badge>
          );
        },
      },
      {
        id: 'targetEntity',
        header: 'Target Entity',
        size: 300,
        minSize: 240,
        maxSize: 360,
        cell: ({ row }) => {
          const text = buildTargetEntity(row.original);
          return <TruncatedTextWithTooltip text={text} />;
        },
      },
      {
        id: 'eventDetails',
        header: 'Event Details',
        size: 420,
        minSize: 320,
        maxSize: 560,
        cell: ({ row }) => {
          const text = buildEventDetails(row.original);
          return <TruncatedTextWithTooltip text={text} />;
        },
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP Address',
        size: 150,
        minSize: 140,
        maxSize: 180,
        cell: ({ row }) => row.original.ipAddress ?? '-',
      },
    ],
    []
  );

  return (
    <TooltipProvider delayDuration={200}>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-background p-6 text-foreground">
        <div className="mb-4">
          <h1
            className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}
          >
            System Audit Log
          </h1>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <FilterBar
            searchQuery={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Search..."
            fields={filterFieldConfigs}
            appliedFilters={appliedFilters}
            onApplyFilter={setOrReplaceFilter}
            onClearFilter={clearFilter}
            onClearAllFilters={clearAllFilters}
          >
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => setExportOpen(true)}
            >
              <Download className="size-4" />
              Export Log (CSV)
            </Button>
          </FilterBar>

          <DataTable<AuditLogRow, unknown>
            columns={tableColumns}
            data={rows}
            pageSizeOptions={[16, 24, 32, 48]}
            manualPagination={true}
            pageCount={meta.totalPages}
            paginationState={pagination}
            onPaginationChange={setPagination}
            enableRowSelection={false}
            footerText={`Showing ${rows.length} of ${meta.total} secure audit event(s)`}
            emptyState={{
              title: 'No audit events found',
              description:
                debouncedQuery.length > 0 || appliedFilters.length > 0
                  ? 'No audit events match the current search and filters.'
                  : 'Audit events will appear here once users start performing actions.',
            }}
            className={cn(
              isPending && 'opacity-50 pointer-events-none transition-opacity'
            )}
          />
        </div>
      </main>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Export audit log</DialogTitle>
            <DialogDescription>
              Your current search and filters apply to every option.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {(
              [
                {
                  value: 'recent',
                  label: `Most recent ${AUDIT_EXPORT_LIMIT.toLocaleString()} records`,
                },
                {
                  value: 'page',
                  label: `Current page (${rows.length} rows)`,
                },
                { value: 'range', label: 'Custom date range' },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="export-scope"
                  value={option.value}
                  checked={exportScope === option.value}
                  onChange={() => setExportScope(option.value)}
                />
                {option.label}
              </label>
            ))}

            {exportScope === 'range' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="export-from">From</Label>
                  <Input
                    id="export-from"
                    type="date"
                    className="h-9"
                    value={exportFrom}
                    onChange={(event) => setExportFrom(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="export-to">To</Label>
                  <Input
                    id="export-to"
                    type="date"
                    className="h-9"
                    value={exportTo}
                    onChange={(event) => setExportTo(event.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
