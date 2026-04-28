"use client";

import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { format } from "date-fns";
import { ChevronDown, Download, Search, X } from "lucide-react";

import { getAuditLogs, type AuditLogRow, type PaginatedAuditLogsResult } from "@/actions/audit-log";
import type { PaginationState } from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { ColumnDef } from "@tanstack/react-table";

type FilterOperator = "is" | "is not";

type AuditFilterField =
    | "Action Taken"
    | "Target Entity"
    | "User"
    | "IP Address"
    | "Event Details";

type AppliedFilter = {
    field: AuditFilterField;
    operator: FilterOperator;
    value: string;
};

type AuditLogClientProps = {
    initialResult?: PaginatedAuditLogsResult;
};

const FILTER_FIELDS: AuditFilterField[] = [
    "Action Taken",
    "Target Entity",
    "User",
    "IP Address",
    "Event Details",
];

const ACTION_BADGE_STYLES: Record<string, string> = {
    CREATE: "border-emerald-300 bg-emerald-50 text-emerald-700",
    UPDATE: "border-sky-300 bg-sky-50 text-sky-700",
    DELETE: "border-rose-300 bg-rose-50 text-rose-700",
    DISPOSED: "border-orange-300 bg-orange-50 text-orange-700",
    EXPORTED: "border-amber-300 bg-amber-50 text-amber-700",
    LOGIN: "border-violet-300 bg-violet-50 text-violet-700",
    LOGOUT: "border-slate-300 bg-slate-50 text-slate-700",
};

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return "?";
    }

    return parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
}

function formatAuditTimestamp(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return format(date, "yyyy-MM-dd HH:mm:ss");
}

function humanizeFieldName(field: string) {
    return field
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\bId\b/g, "ID")
        .replace(/\bMac\b/g, "MAC")
        .replace(/\bIp\b/g, "IP")
        .replace(/\s+/g, " ")
        .trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function areValuesEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) {
        return true;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
        if (left.length !== right.length) {
            return false;
        }

        for (let index = 0; index < left.length; index += 1) {
            if (!areValuesEqual(left[index], right[index])) {
                return false;
            }
        }

        return true;
    }

    if (isPlainObject(left) && isPlainObject(right)) {
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);

        if (leftKeys.length !== rightKeys.length) {
            return false;
        }

        for (const key of leftKeys) {
            if (!Object.prototype.hasOwnProperty.call(right, key)) {
                return false;
            }

            if (!areValuesEqual(left[key], right[key])) {
                return false;
            }
        }

        return true;
    }

    return false;
}

function formatAuditValue(field: string, value: unknown) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    if (typeof value === "number") {
        if (/cost|price|amount|value|salary|budget|total|salvage|shipping|tax|base/i.test(field)) {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
            }).format(value);
        }

        return new Intl.NumberFormat("en-US").format(value);
    }

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    if (Array.isArray(value)) {
        return value.map((item) => String(item)).join(", ");
    }

    if (isPlainObject(value)) {
        return JSON.stringify(value);
    }

    const text = String(value);
    if (/cost|price|amount|value|salary|budget|total|salvage|shipping|tax|base/i.test(field)) {
        const parsed = Number(text.replace(/[^0-9.-]/g, ""));
        if (Number.isFinite(parsed) && text.trim().length > 0) {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
            }).format(parsed);
        }
    }

    return text;
}

function buildEventDetails(row: AuditLogRow) {
    const action = row.actionType.trim().toUpperCase();
    const oldValue = row.oldValue;
    const newValue = row.newValue;

    if (!oldValue || !newValue) {
        if (action === "CREATE") {
            return `Created ${humanizeFieldName(row.entityType).toLowerCase()}`;
        }

        if (action === "DELETE") {
            return `Deleted ${humanizeFieldName(row.entityType).toLowerCase()}`;
        }

        return "Updated record";
    }

    const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    for (const key of keys) {
        if (!areValuesEqual(oldValue[key], newValue[key])) {
            const oldDisplay = formatAuditValue(key, oldValue[key]);
            const newDisplay = formatAuditValue(key, newValue[key]);
            const label = humanizeFieldName(key);

            if (action === "CREATE") {
                return `Created ${label} as [${newDisplay}]`;
            }

            if (action === "DELETE") {
                return `Deleted ${label} [${oldDisplay}]`;
            }

            return `Changed ${label} from [${oldDisplay}] → [${newDisplay}]`;
        }
    }

    return "Updated record";
}

function buildTargetEntity(row: AuditLogRow) {
    if (row.entityLabel && row.entityLabel.trim().length > 0) {
        return row.entityLabel;
    }

    return `${humanizeFieldName(row.entityType)}: ${row.entityId}`;
}

function buildSearchBlob(row: AuditLogRow) {
    return [
        formatAuditTimestamp(row.performedAt),
        row.performedBy?.name ?? "",
        row.performedBy?.email ?? "",
        row.actionType,
        buildTargetEntity(row),
        buildEventDetails(row),
        row.ipAddress ?? "",
    ]
        .join(" ")
        .toLowerCase();
}

function escapeCsvValue(value: string) {
    return `"${value.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: AuditLogRow[]) {
    const header = [
        "Timestamp",
        "User",
        "Action Taken",
        "Target Entity",
        "Event Details",
        "IP Address",
    ];

    const csvRows = rows.map((row) => {
        const user = row.performedBy
            ? `${row.performedBy.name} <${row.performedBy.email}>`
            : "Unknown";

        return [
            formatAuditTimestamp(row.performedAt),
            user,
            row.actionType,
            buildTargetEntity(row),
            buildEventDetails(row),
            row.ipAddress ?? "-",
        ].map((value) => escapeCsvValue(value));
    });

    const csv = [header.map(escapeCsvValue).join(","), ...csvRows.map((row) => row.join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `system-audit-log-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
}

export default function AuditLogClient({ initialResult }: AuditLogClientProps) {
    const [rows, setRows] = useState<AuditLogRow[]>(initialResult?.data ?? []);
    const [meta, setMeta] = useState(initialResult?.meta ?? { total: 0, page: 1, pageSize: 16, totalPages: 1 });
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: (initialResult?.meta?.page ?? 1) - 1,
        pageSize: initialResult?.meta?.pageSize ?? 16,
    });

    const [searchValue, setSearchValue] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);

    const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
    const [draftField, setDraftField] = useState<AuditFilterField>("Action Taken");
    const [draftOperator, setDraftOperator] = useState<FilterOperator>("is");
    const [draftValue, setDraftValue] = useState("");

    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedQuery(searchValue.trim().toLowerCase());
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }, 200);

        return () => window.clearTimeout(timeoutId);
    }, [searchValue]);

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
    }, [pagination.pageIndex, pagination.pageSize, debouncedQuery, appliedFilters]);

    useEffect(() => {
        startTransition(() => {
            loadRows();
        });
    }, [loadRows]);

    const setOrReplaceFilter = (nextFilter: AppliedFilter) => {
        setAppliedFilters((currentFilters) => {
            const remainingFilters = currentFilters.filter(
                (filter) => filter.field !== nextFilter.field
            );

            return [...remainingFilters, nextFilter];
        });
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        setIsFilterPopoverOpen(false);
    };

    const clearFilter = (field: AuditFilterField) => {
        setAppliedFilters((currentFilters) =>
            currentFilters.filter((filter) => filter.field !== field)
        );
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const clearAllFilters = () => {
        setAppliedFilters([]);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const tableColumns = useMemo<ColumnDef<AuditLogRow>[]>(() => [
        {
            accessorKey: "performedAt",
            header: "Timestamp",
            size: 180,
            minSize: 180,
            maxSize: 220,
            cell: ({ row }) => formatAuditTimestamp(row.original.performedAt),
        },
        {
            id: "performedBy",
            header: "User",
            size: 260,
            minSize: 220,
            maxSize: 320,
            meta: { noTruncate: true },
            cell: ({ row }) => {
                const performedBy = row.original.performedBy;

                return (
                    <div className="flex min-w-0 items-center gap-3 py-0.5">
                        <Avatar className="size-7 rounded-md">
                            <AvatarImage src={performedBy?.avatarUrl ?? undefined} alt={performedBy?.name ?? "Unknown"} />
                            <AvatarFallback className="rounded-md bg-slate-300 text-xs font-semibold text-slate-700">
                                {getInitials(performedBy?.name ?? "?")}
                            </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-5 text-slate-900">
                                {performedBy?.name ?? "Unknown"}
                            </p>
                            <p className="truncate text-xs leading-4 text-slate-500">
                                {performedBy?.email ?? "Unknown"}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "actionType",
            header: "Action Taken",
            size: 150,
            minSize: 140,
            maxSize: 180,
            cell: ({ row }) => {
                const action = row.original.actionType.trim().toUpperCase();
                const actionClassName =
                    ACTION_BADGE_STYLES[action] ?? "border-slate-300 bg-slate-50 text-slate-700";

                return (
                    <Badge
                        variant="outline"
                        className={cn(
                            "h-5 rounded-full px-2 text-[11px] font-semibold tracking-wide",
                            actionClassName
                        )}
                    >
                        {action}
                    </Badge>
                );
            },
        },
        {
            id: "targetEntity",
            header: "Target Entity",
            size: 300,
            minSize: 240,
            maxSize: 360,
            meta: { noTruncate: true },
            cell: ({ row }) => buildTargetEntity(row.original),
        },
        {
            id: "eventDetails",
            header: "Event Details",
            size: 420,
            minSize: 320,
            maxSize: 560,
            meta: { noTruncate: true },
            cell: ({ row }) => buildEventDetails(row.original),
        },
        {
            accessorKey: "ipAddress",
            header: "IP Address",
            size: 150,
            minSize: 140,
            maxSize: 180,
            cell: ({ row }) => row.original.ipAddress ?? "-",
        },
    ], []);

    const emptyDescription =
        debouncedQuery.length > 0 || appliedFilters.length > 0
            ? "No audit events match the current search and filters."
            : "Audit events will appear here once users start performing actions.";

    return (
        <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-white p-6 text-slate-900">
            <div className="mb-4">
                <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-slate-900`}>
                    System Audit Log
                </h1>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative w-full max-w-136 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                            placeholder="Search..."
                            className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm font-normal placeholder:text-slate-400"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    Filters
                                    <ChevronDown className="size-4" />
                                </Button>
                            </PopoverTrigger>

                            <PopoverContent
                                align="end"
                                side="bottom"
                                sideOffset={10}
                                className="w-80 rounded-lg border border-slate-200 p-0"
                            >
                                <div className="border-b border-slate-200 px-3 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-semibold text-slate-700">Filter by</h3>
                                        <button
                                            type="button"
                                            className="text-slate-400 transition-colors hover:text-slate-600"
                                            onClick={() => setIsFilterPopoverOpen(false)}
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 px-3 py-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-500">Field</label>
                                        <Select value={draftField} onValueChange={(value) => setDraftField(value as AuditFilterField)}>
                                            <SelectTrigger className="h-8 w-full rounded-lg border-slate-200 text-sm text-slate-800">
                                                <SelectValue placeholder="Select field" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FILTER_FIELDS.map((field) => (
                                                    <SelectItem key={field} value={field}>
                                                        {field}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-500">Operator</label>
                                        <Select value={draftOperator} onValueChange={(value) => setDraftOperator(value as FilterOperator)}>
                                            <SelectTrigger className="h-8 w-full rounded-lg border-slate-200 text-sm text-slate-800">
                                                <SelectValue placeholder="Select operator" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="is">is</SelectItem>
                                                <SelectItem value="is not">is not</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-500">Value</label>
                                        {draftField === "Action Taken" ? (
                                            <Select value={draftValue} onValueChange={setDraftValue}>
                                                <SelectTrigger className="h-8 w-full rounded-lg border-slate-200 text-sm text-slate-800">
                                                    <SelectValue placeholder="Select action" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.keys(ACTION_BADGE_STYLES).map((action) => (
                                                        <SelectItem key={action} value={action}>
                                                            {action}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                value={draftValue}
                                                onChange={(e) => setDraftValue(e.target.value)}
                                                placeholder={`Enter ${draftField.toLowerCase()}`}
                                                className="h-8 w-full rounded-lg border-slate-200 text-sm text-slate-800"
                                            />
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-3 text-sm text-slate-600 hover:bg-slate-100"
                                            onClick={clearAllFilters}
                                            disabled={appliedFilters.length === 0}
                                        >
                                            Clear all
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90"
                                            onClick={() =>
                                                draftValue.length > 0
                                                    ? setOrReplaceFilter({
                                                        field: draftField,
                                                        operator: draftOperator,
                                                        value: draftValue,
                                                    })
                                                    : undefined
                                            }
                                            disabled={draftValue.length === 0}
                                        >
                                            Apply filter
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            onClick={() => downloadCsv(rows)}
                        >
                            <Download className="size-4" />
                            Export Log (CSV)
                        </Button>
                    </div>
                </div>
                {appliedFilters.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {appliedFilters.map((filter) => (
                            <Badge
                                key={`${filter.field}-${filter.operator}-${filter.value}`}
                                variant="outline"
                                className="h-7 gap-2 rounded-full border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700"
                            >
                                <span>
                                    {filter.field} {filter.operator} {filter.value}
                                </span>
                                <button
                                    type="button"
                                    className="text-slate-400 transition-colors hover:text-slate-600"
                                    onClick={() => clearFilter(filter.field)}
                                    aria-label={`Clear ${filter.field} filter`}
                                >
                                    <X className="size-3.5" />
                                </button>
                            </Badge>
                        ))}

                        <button
                            type="button"
                            className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
                            onClick={clearAllFilters}
                        >
                            Clear filters
                        </button>
                    </div>
                ) : null}

                <DataTable<AuditLogRow, unknown>
                    columns={tableColumns}
                    data={rows}
                    initialPageSize={meta.pageSize}
                    pageSizeOptions={[16, 24, 32, 48]}
                    manualPagination={true}
                    pageCount={meta.totalPages}
                    paginationState={pagination}
                    onPaginationChange={setPagination}
                    enableRowSelection={false}
                    emptyState={{
                        title: "No audit events found",
                        description:
                            debouncedQuery.length > 0 || appliedFilters.length > 0
                                ? "No audit events match the current search and filters."
                                : "Audit events will appear here once users start performing actions.",
                    }}
                    className={cn(isPending && "opacity-50 pointer-events-none transition-opacity")}
                />
            </div>
        </main>
    );
}
