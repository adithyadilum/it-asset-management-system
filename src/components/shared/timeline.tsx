'use client';

import { formatMoneyByCurrency } from '@/lib/currency';
import React from 'react';
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
  {
    Icon: React.FC<{ className?: string }>;
    color: string;
    ringClass: string;
    badgeClass: string;
  }
> = {
  CREATE: {
    Icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    ringClass: 'ring-emerald-200 dark:ring-emerald-900/50',
    badgeClass:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
  UPDATE: {
    Icon: PenTool,
    color: 'text-sky-600 dark:text-sky-400',
    ringClass: 'ring-sky-200 dark:ring-sky-900/50',
    badgeClass:
      'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400',
  },
  DELETE: {
    Icon: Trash2,
    color: 'text-rose-600 dark:text-rose-400',
    ringClass: 'ring-rose-200 dark:ring-rose-900/50',
    badgeClass:
      'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400',
  },
  DISPOSE: {
    Icon: Trash2,
    color: 'text-orange-600 dark:text-orange-400',
    ringClass: 'ring-orange-200 dark:ring-orange-900/50',
    badgeClass:
      'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400',
  },
  DISPOSED: {
    Icon: Trash2,
    color: 'text-orange-600 dark:text-orange-400',
    ringClass: 'ring-orange-200 dark:ring-orange-900/50',
    badgeClass:
      'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400',
  },
  EXPORTED: {
    Icon: Download,
    color: 'text-amber-600 dark:text-amber-400',
    ringClass: 'ring-amber-200 dark:ring-amber-900/50',
    badgeClass:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
  },
  LOGIN: {
    Icon: LogIn,
    color: 'text-violet-600 dark:text-violet-400',
    ringClass: 'ring-violet-200 dark:ring-violet-900/50',
    badgeClass:
      'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400',
  },
  LOGOUT: {
    Icon: LogOut,
    color: 'text-muted-foreground dark:text-zinc-400',
    ringClass: 'ring-border dark:ring-zinc-800',
    badgeClass:
      'border-border bg-muted text-foreground dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400',
  },
  ACCESS_DENIED: {
    Icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    ringClass: 'ring-red-200 dark:ring-red-900/50',
    badgeClass:
      'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400',
  },
  STATUS_CHANGE: {
    Icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-400',
    ringClass: 'ring-amber-200 dark:ring-amber-900/50',
    badgeClass:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
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
    if (
      /cost|price|amount|value|salary|budget|total|salvage|shipping|tax|base/i.test(
        field
      )
    ) {
      return formatMoneyByCurrency(value, 'USD');
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
  if (
    /cost|price|amount|value|salary|budget|total|salvage|shipping|tax|base/i.test(
      field
    )
  ) {
    const parsed = Number(text.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed) && text.trim().length > 0) {
      return formatMoneyByCurrency(parsed, 'USD');
    }
  }

  return text;
}

function humanizeFieldName(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\bId\b/gi, 'ID')
    .replace(/\bMac\b/gi, 'MAC')
    .replace(/\bIp\b/gi, 'IP')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) =>
      word.toUpperCase() === 'ID' ||
      word.toUpperCase() === 'IP' ||
      word.toUpperCase() === 'MAC'
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
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
        field: humanizeFieldName(key),
        oldValue: '-',
        newValue: formatTimelineValue(key, newValue[key]),
      });
    }

    return changes;
  }

  if (oldValue && !newValue) {
    for (const key of Object.keys(oldValue)) {
      changes.push({
        field: humanizeFieldName(key),
        oldValue: formatTimelineValue(key, oldValue[key]),
        newValue: '-',
      });
    }

    return changes;
  }

  // Keep every changed field so the history card tells the full story.
  const safeOldValue = oldValue ?? {};
  const safeNewValue = newValue ?? {};
  const allKeys = new Set([
    ...Object.keys(safeOldValue),
    ...Object.keys(safeNewValue),
  ]);
  for (const key of allKeys) {
    const old = safeOldValue[key];
    const neu = safeNewValue[key];

    if (!areValuesEqual(old, neu)) {
      changes.push({
        field: humanizeFieldName(key),
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
      <div className="py-8 text-center text-sm text-muted-foreground">
        No history available
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative border-l-2 border-border ml-3 mt-6 space-y-8">
        {historyLogs.map((log) => {
          // Match each action to its own visual tone.
          const iconConfig = ACTION_ICON_MAP[log.actionType] || {
            Icon: AlertCircle,
            color: 'text-muted-foreground dark:text-zinc-400',
            ringClass: 'ring-border dark:ring-zinc-800',
            badgeClass:
              'border-gray-300 bg-muted text-foreground dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400',
          };
          const changes = buildChangeList(log.oldValue, log.newValue);
          const actionLabel = log.actionType.replace(/_/g, ' ');

          return (
            <div key={log.id} className="relative pl-8">
              {/* Timeline Node Icon */}
              <div
                className={`absolute -left-3 top-1 rounded-full bg-background p-0.5 ring-2 ${iconConfig.ringClass}`}
              >
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
                      <span className="text-sm text-foreground font-medium">
                        {log.entityLabel}
                      </span>
                    )}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
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
                      <AvatarFallback className="rounded-md bg-muted text-xs font-semibold text-foreground">
                        {getInitials(log.performedBy.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-xs">
                      <p className="font-medium text-foreground">
                        {log.performedBy.name}
                      </p>
                      <p className="text-muted-foreground">
                        {log.performedBy.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    System action
                  </p>
                )}

                {/* Show all changed fields for the record. */}
                {changes.length > 0 && (
                  <div className="mt-1 space-y-2 rounded-md border border-border bg-muted p-3 text-xs">
                    {changes.map((change) => (
                      <div
                        key={`${log.id}-${change.field}`}
                        className="space-y-1"
                      >
                        {change.field === 'reason' ? (
                          <div className="mt-1 text-xs italic text-muted-foreground border-l-2 border-border pl-2">
                            &quot;{change.newValue}&quot;
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-start gap-1 text-foreground">
                            <span className="font-medium text-foreground">
                              {change.field}:
                            </span>
                            <span className="line-through text-muted-foreground">
                              {change.oldValue}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium text-foreground">
                              {change.newValue}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* IP Address (if available) */}
                {log.ipAddress && (
                  <p className="text-xs text-muted-foreground">
                    From:{' '}
                    <code className="bg-muted px-1 rounded">
                      {log.ipAddress}
                    </code>
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
