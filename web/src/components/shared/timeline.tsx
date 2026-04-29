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
}

const ACTION_ICON_MAP: Record<
    string,
    { Icon: React.FC<{ className?: string }>; color: string }
> = {
    CREATE: { Icon: CheckCircle2, color: 'text-emerald-600' },
    UPDATE: { Icon: PenTool, color: 'text-sky-600' },
    DELETE: { Icon: Trash2, color: 'text-rose-600' },
    DISPOSE: { Icon: Trash2, color: 'text-orange-600' },
    DISPOSED: { Icon: Trash2, color: 'text-orange-600' },
    EXPORTED: { Icon: Download, color: 'text-amber-600' },
    LOGIN: { Icon: LogIn, color: 'text-violet-600' },
    LOGOUT: { Icon: LogOut, color: 'text-slate-600' },
    ACCESS_DENIED: { Icon: AlertCircle, color: 'text-red-600' },
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

function buildDiffDisplay(
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null
): { field: string; oldVal: string; newVal: string } | null {
    if (!oldValue || !newValue || typeof oldValue !== 'object' || typeof newValue !== 'object') {
        return null;
    }

    // Find the first field that changed
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    for (const key of allKeys) {
        const old = (oldValue as Record<string, unknown>)[key];
        const neu = (newValue as Record<string, unknown>)[key];
        if (old !== neu) {
            return {
                field: key.replace(/([a-z])([A-Z])/g, '$1 $2'),
                oldVal: String(old ?? '—'),
                newVal: String(neu ?? '—'),
            };
        }
    }

    return null;
}

export function AssetHistoryTimeline({
    historyLogs,
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
                    const iconConfig = ACTION_ICON_MAP[log.actionType] || {
                        Icon: AlertCircle,
                        color: 'text-gray-600',
                    };
                    const diff = buildDiffDisplay(log.oldValue, log.newValue);

                    return (
                        <div key={log.id} className="relative pl-8">
                            {/* Timeline Node Icon */}
                            <div className="absolute -left-3 top-1 bg-white rounded-full p-0.5 ring-2 ring-gray-200">
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
                                        <Badge variant="outline">
                                            {log.actionType.replace('_', ' ')}
                                        </Badge>
                                        {log.entityLabel && (
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
                                        <Avatar className="h-6 w-6">
                                            {log.performedBy.avatarUrl && (
                                                <AvatarImage
                                                    src={log.performedBy.avatarUrl}
                                                    alt={log.performedBy.name}
                                                />
                                            )}
                                            <AvatarFallback className="text-xs">
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

                                {/* Changes Display */}
                                {diff && (
                                    <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-100 text-xs">
                                        <span className="text-gray-700">
                                            {diff.field}:{' '}
                                            <span className="line-through text-gray-400">
                                                {diff.oldVal}
                                            </span>
                                            {' → '}
                                            <span className="font-medium text-gray-900">
                                                {diff.newVal}
                                            </span>
                                        </span>
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