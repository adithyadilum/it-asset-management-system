'use client';

import { format } from 'date-fns';
import {
    CheckCircle2,
    PenTool,
    Trash2,
    LogOut,
    LogIn,
    AlertCircle,
    Download,
} from 'lucide-react';
import type { AuditLogRow } from '@/actions/audit-log';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface AssetHistoryTimelineProps {
    historyLogs: AuditLogRow[];
    showEntityLabel?: boolean;
}

type TimelineChange = {
    field: string;
    oldValue: string;
    newValue: string;
};

const ACTION_ICON_MAP: Record<
    string,
    { Icon: React.FC<{ className?: string }>; color: string; ringClass: string; badgeClass: string }
> = {
    CREATE: {
        Icon: CheckCircle2,
        color: 'text-emerald-600',
        ringClass: 'ring-emerald-200',
        badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    },
    UPDATE: {
        Icon: PenTool,
        color: 'text-sky-600',
        ringClass: 'ring-sky-200',
        badgeClass: 'border-sky-300 bg-sky-50 text-sky-700',
    },
    DELETE: {
        Icon: Trash2,
        color: 'text-rose-600',
        ringClass: 'ring-rose-200',
        badgeClass: 'border-rose-300 bg-rose-50 text-rose-700',
    },
    DISPOSE: {
        Icon: Trash2,
        color: 'text-orange-600',
        ringClass: 'ring-orange-200',
        badgeClass: 'border-orange-300 bg-orange-50 text-orange-700',
    },
    DISPOSED: {
        Icon: Trash2,
        color: 'text-orange-600',
        ringClass: 'ring-orange-200',
        badgeClass: 'border-orange-300 bg-orange-50 text-orange-700',
    },
    EXPORTED: {
        Icon: Download,
        color: 'text-amber-600',
        ringClass: 'ring-amber-200',
        badgeClass: 'border-amber-300 bg-amber-50 text-amber-700',
    },
    LOGIN: {
        Icon: LogIn,
        color: 'text-violet-600',
        ringClass: 'ring-violet-200',
        badgeClass: 'border-violet-300 bg-violet-50 text-violet-700',
    },
    LOGOUT: {
        Icon: LogOut,
        color: 'text-slate-600',
        ringClass: 'ring-slate-200',
        badgeClass: 'border-slate-300 bg-slate-50 text-slate-700',
    },
    ACCESS_DENIED: {
        Icon: AlertCircle,
        color: 'text-red-600',
        ringClass: 'ring-red-200',
        badgeClass: 'border-red-300 bg-red-50 text-red-700',
    },
};

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

function formatTimestamp(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return format(date, 'yyyy-MM-dd HH:mm:ss');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function formatTimelineValue(field: string, value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'number') {
        if (/cost|price|amount|value|salary|budget|total|salvage|shipping|tax|base/i.test(field)) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 2,
            }).format(value);
        }

        return new Intl.NumberFormat('en-US').format(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => String(item)).join(', ');
    }

    if (isPlainObject(value)) {
        return JSON.stringify(value);
    }

    const text = String(value);
    if (/cost|price|amount|value|salary|budget|total|salvage|shipping|tax|base/i.test(field)) {
        const parsed = Number(text.replace(/[^0-9.-]/g, ''));
        if (Number.isFinite(parsed) && text.trim().length > 0) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 2,
            }).format(parsed);
        }
    }

    return text;
}

function buildChangeList(
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null
): TimelineChange[] {
    const changes: TimelineChange[] = [];

    // Handle create/delete rows where only one side of the diff exists.
    if (!oldValue && !newValue) {
        return changes;
    }

    if (!oldValue && newValue) {
        for (const key of Object.keys(newValue)) {
            changes.push({
                field: key.replace(/([a-z])([A-Z])/g, '$1 $2'),
                oldValue: '-',
                newValue: formatTimelineValue(key, newValue[key]),
            });
        }

        return changes;
    }

    if (oldValue && !newValue) {
        for (const key of Object.keys(oldValue)) {
            changes.push({
                field: key.replace(/([a-z])([A-Z])/g, '$1 $2'),
                oldValue: formatTimelineValue(key, oldValue[key]),
                newValue: '-',
            });
        }

        return changes;
    }

    // Keep every changed field so the history card tells the full story.
    const safeOldValue = oldValue ?? {};
    const safeNewValue = newValue ?? {};
    const allKeys = new Set([...Object.keys(safeOldValue), ...Object.keys(safeNewValue)]);
    for (const key of allKeys) {
        const old = safeOldValue[key];
        const neu = safeNewValue[key];

        if (!areValuesEqual(old, neu)) {
            changes.push({
                field: key.replace(/([a-z])([A-Z])/g, '$1 $2'),
                oldValue: formatTimelineValue(key, old),
                newValue: formatTimelineValue(key, neu),
            });
        }
    }

    return changes;
}

export function AssetHistoryTimeline({
    historyLogs,
    showEntityLabel = true,
}: AssetHistoryTimelineProps) {
    if (!historyLogs || historyLogs.length === 0) {
        return (
            <div className="py-8 text-center text-sm text-gray-500">
                No history available
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="relative border-l-2 border-gray-200 ml-3 mt-6 space-y-8">
                {historyLogs.map((log) => {
                    // Match each action to its own visual tone.
                    const iconConfig = ACTION_ICON_MAP[log.actionType] || {
                        Icon: AlertCircle,
                        color: 'text-gray-600',
                        ringClass: 'ring-gray-200',
                        badgeClass: 'border-gray-300 bg-gray-50 text-gray-700',
                    };
                    const changes = buildChangeList(log.oldValue, log.newValue);
                    const actionLabel = log.actionType.replace(/_/g, ' ');

                    return (
                        <div key={log.id} className="relative pl-8">
                            {/* Timeline Node Icon */}
                            <div className={`absolute -left-3 top-1 rounded-full bg-white p-0.5 ring-2 ${iconConfig.ringClass}`}>
                                <iconConfig.Icon
                                    className={`w-5 h-5 ${iconConfig.color}`}
                                    aria-label={`Action: ${log.actionType}`}
                                />
                            </div>

                            {/* Log Content */}
                            <div className="flex flex-col gap-3">
                                {/* Header: Title + Timestamp */}
                                <div className="flex items-baseline justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={iconConfig.badgeClass}>
                                            {actionLabel}
                                        </Badge>
                                        {showEntityLabel && log.entityLabel && (
                                            <span className="text-sm text-gray-700 font-medium">
                                                {log.entityLabel}
                                            </span>
                                        )}
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                                {formatTimestamp(log.performedAt)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {new Date(log.performedAt).toLocaleString()}
                                        </TooltipContent>
                                    </Tooltip>
                                </div>

                                {/* User Info */}
                                {log.performedBy ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="size-7 rounded-md">
                                            {log.performedBy.avatarUrl && (
                                                <AvatarImage
                                                    src={log.performedBy.avatarUrl}
                                                    alt={log.performedBy.name}
                                                />
                                            )}
                                            <AvatarFallback className="rounded-md bg-slate-300 text-xs font-semibold text-slate-700">
                                                {getInitials(log.performedBy.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-xs">
                                            <p className="font-medium text-gray-700">
                                                {log.performedBy.name}
                                            </p>
                                            <p className="text-gray-500">{log.performedBy.email}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 italic">System action</p>
                                )}

                                {/* Show all changed fields for the record. */}
                                {changes.length > 0 && (
                                    <div className="mt-1 space-y-2 rounded-md border border-gray-100 bg-gray-50 p-3 text-xs">
                                        {changes.map((change) => (
                                            <div key={`${log.id}-${change.field}`} className="flex flex-wrap items-start gap-1 text-gray-700">
                                                <span className="font-medium text-gray-800">{change.field}:</span>
                                                <span className="line-through text-gray-400">{change.oldValue}</span>
                                                <span className="text-gray-400">→</span>
                                                <span className="font-medium text-gray-900">{change.newValue}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* IP Address (if available) */}
                                {log.ipAddress && (
                                    <p className="text-xs text-gray-400">
                                        From: <code className="bg-gray-100 px-1 rounded">{log.ipAddress}</code>
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}