"use client";

import { useEffect, useMemo, useState, useTransition, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";

import { getAuditLogs, type AuditLogRow, type PaginatedAuditLogsResult } from "@/actions/audit-log";
import type { PaginationState } from "@tanstack/react-table";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatMoneyByCurrency } from "@/lib/currency";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar, type AppliedFilter, type FilterFieldConfig } from "@/components/shared/filter-bar";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { ColumnDef } from "@tanstack/react-table";

type AuditFilterField =
    | "Action Taken"
    | "Target Entity"
    | "User"
    | "IP Address"
    | "Event Details";

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
    CREATE: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
    UPDATE: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400",
    DELETE: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
    DISPOSE: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400",
    DISPOSED: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400",
    EXPORTED: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
    LOGIN: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400",
    LOGOUT: "border-border bg-muted text-foreground dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400",
    ACCESS_DENIED: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
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

function humanizeFieldName(field: string): string {
    return field
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\bId\b/gi, "ID")
        .replace(/\bMac\b/gi, "MAC")
        .replace(/\bIp\b/gi, "IP")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map((word) => (word.toUpperCase() === "ID" || word.toUpperCase() === "IP" || word.toUpperCase() === "MAC" ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
        .join(" ");
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
            return formatMoneyByCurrency(value, "USD"); // Kept string for audit display
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
            return formatMoneyByCurrency(parsed, "USD");
        }
    }

    return text;
}

function buildEventDetails(row: AuditLogRow) {
    const action = row.actionType.trim().toUpperCase();
    const oldValue = row.oldValue;
    const newValue = row.newValue;

    // Login/logout rows are simple audit events with no diff payload.
    if (action === "LOGIN") {
        return "User logged in";
    }

    if (action === "LOGOUT") {
        return "User logged out";
    }

    if (!oldValue || !newValue) {
        if (action === "CREATE") {
            return `Created ${humanizeFieldName(row.entityType).toLowerCase()}`;
        }

        if (action === "DELETE") {
            return `Deleted ${humanizeFieldName(row.entityType).toLowerCase()}`;
        }

        if (action === "ACCESS_DENIED") {
            const role = row.newValue?.role ? String(row.newValue.role) : "Unknown";
            return `Access denied for role [${humanizeFieldName(role)}]`;
        }

        return "Updated record";
    }

    // Show the first changed field so the table stays compact.
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
        const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(checkTruncation) : null;

        checkTruncation();
        resizeObserver?.observe(ref.current);
        window.addEventListener("resize", checkTruncation);

        return () => {
            window.clearTimeout(timeoutId);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", checkTruncation);
        };
    }, [text]);

    const textNode = (
        <span
            ref={ref}
            className="block w-full min-w-0 truncate text-sm"
            style={{ cursor: isTruncated ? "help" : "default" }}
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

    const [isPending, startTransition] = useTransition();

    // Debounce search so we only query the server after the user pauses typing.
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

    // Reload whenever paging, search, or filters change.
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
            if (field === "Action Taken") {
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
                            <AvatarFallback className="rounded-md bg-muted text-xs font-semibold text-foreground">
                                {getInitials(performedBy?.name ?? "?")}
                            </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-5 text-foreground">
                                {performedBy?.name ?? "Unknown"}
                            </p>
                            <p className="truncate text-xs leading-4 text-muted-foreground">
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
                    ACTION_BADGE_STYLES[action] ?? "border-border bg-muted text-foreground dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400";

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
            cell: ({ row }) => {
                const text = buildTargetEntity(row.original);
                return <TruncatedTextWithTooltip text={text} />;
            },
        },
        {
            id: "eventDetails",
            header: "Event Details",
            size: 420,
            minSize: 320,
            maxSize: 560,
            cell: ({ row }) => {
                const text = buildEventDetails(row.original);
                return <TruncatedTextWithTooltip text={text} />;
            },
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

    return (
        <TooltipProvider delayDuration={200}>
            <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-background p-6 text-foreground">
                <div className="mb-4">
                    <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}>
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
                            onClick={() => downloadCsv(rows)}
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
        </TooltipProvider>
    );
}
