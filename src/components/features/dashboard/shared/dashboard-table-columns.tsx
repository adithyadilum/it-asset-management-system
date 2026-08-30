'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DateFormatted } from '@/components/shared/formatters';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatMoneyByCurrency, convertCurrencyAmount } from '@/lib/currency';
import { ArrowUpRight, BellRing, Flag, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  OverdueReturnRow,
  HighMaintenanceRow,
  PendingDisposalRow,
  PendingMaintenanceRow,
  TopHighValueAssetRow,
  SoftwareOptimizationRow,
  DepreciationLedgerRow,
  WriteOffLedgerRow,
} from '@/types/dashboard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getDaysPendingStatus(
  days: number
): 'critical' | 'warning' | 'neutral' {
  if (days > 30) return 'critical';
  if (days >= 1 && days <= 14) return 'warning';
  return 'neutral';
}

/**
 * The email sits in the `title` rather than a second line.
 *
 * These tables share the dashboard's two-column grid, which gives each of them
 * about 540px -- less than the ~890px their columns used to ask for, so the
 * last columns were pushed off-screen entirely. Dropping the email line is
 * most of the width back, and it was the least useful thing on the row.
 */
export function EmployeeCell({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-2" title={email}>
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback className="text-[9px] font-semibold bg-muted">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-xs font-semibold text-foreground">
        {name}
      </span>
    </div>
  );
}

/** Icon-only row action, so the column costs ~52px instead of ~140px. */
function RowAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  destructive,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-label={label}
      title={label}
      className={cn(
        'h-7 w-7 p-0 transition-all active:scale-95',
        destructive
          ? 'hover:bg-destructive hover:text-destructive-foreground'
          : 'hover:bg-primary hover:text-primary-foreground'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function useOverdueColumns(
  actionLabel: string,
  onSendReminder: (row: OverdueReturnRow) => void,
  sendingReminderIds: number[]
): ColumnDef<OverdueReturnRow>[] {
  return useMemo(
    () => [
      {
        id: 'employee',
        header: 'Employee',
        size: 150,
        minSize: 130,
        cell: ({ row }) => (
          <EmployeeCell
            name={row.original.employeeName}
            email={row.original.employeeEmail}
          />
        ),
      },
      {
        id: 'department',
        header: 'Dept',
        size: 95,
        minSize: 80,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.department || '—'}
          </span>
        ),
      },
      {
        id: 'asset',
        header: 'Asset',
        size: 145,
        minSize: 120,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.assetName} ({row.original.assetTag})
          </span>
        ),
      },
      {
        // Date and lateness in one column. They were two, and the pair cost
        // 260px in a 540px table -- enough to push Actions off-screen.
        id: 'expectedReturnDate',
        header: 'Due',
        size: 96,
        minSize: 88,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="text-xs text-muted-foreground">
              <DateFormatted date={row.original.expectedReturnDate} />
            </span>
            <span className="text-[10px] font-semibold text-destructive">
              {row.original.daysOverdue}d over
            </span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 52,
        minSize: 52,
        meta: { noTruncate: true },
        cell: ({ row }) => {
          const isSending = sendingReminderIds.includes(
            row.original.assignmentId
          );
          return (
            <RowAction
              label={isSending ? 'Sending…' : actionLabel}
              icon={isSending ? Loader2 : BellRing}
              onClick={() => onSendReminder(row.original)}
              disabled={isSending}
            />
          );
        },
      },
    ],
    [actionLabel, onSendReminder, sendingReminderIds]
  );
}

export function usePendingDisposalColumns(
  userRole: string
): ColumnDef<PendingDisposalRow>[] {
  const router = useRouter();

  return useMemo(
    () => [
      {
        id: 'requestedBy',
        header: 'Requested By',
        size: 175,
        minSize: 150,
        cell: ({ row }) => (
          <EmployeeCell
            name={row.original.requestedBy}
            email={row.original.requestedByEmail}
          />
        ),
      },
      {
        id: 'asset',
        header: 'Asset',
        size: 185,
        minSize: 150,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.assetName} ({row.original.assetTag})
          </span>
        ),
      },
      {
        id: 'daysPending',
        header: 'Pending',
        size: 122,
        minSize: 105,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <StatusBadge
            value={getDaysPendingStatus(row.original.daysPending)}
            label={`${row.original.daysPending} ${row.original.daysPending === 1 ? 'Day' : 'Days'}`}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 56,
        minSize: 56,
        meta: { noTruncate: true },
        cell: ({ row }) => {
          if (userRole === 'FinancialAuditor') {
            return (
              <span
                className="text-xs text-muted-foreground italic"
                title="Awaiting Admin Sign-Off"
              >
                —
              </span>
            );
          }
          return (
            <RowAction
              label="Take Action"
              icon={ArrowUpRight}
              destructive
              onClick={() =>
                router.push(
                  `/operations/disposals?panel=review&id=${row.original.disposalId}`
                )
              }
            />
          );
        },
      },
    ],
    [router, userRole]
  );
}

export function useHighMaintenanceColumns(
  onFlag: (asset: HighMaintenanceRow) => void
): ColumnDef<HighMaintenanceRow>[] {
  return useMemo(
    () => [
      {
        id: 'asset',
        header: 'Asset ID',
        size: 190,
        minSize: 150,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.assetName} ({row.original.assetTag})
          </span>
        ),
      },
      {
        id: 'repairCount',
        header: 'Repairs',
        size: 125,
        minSize: 100,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.repairCount}{' '}
            {row.original.repairCount === 1 ? 'Repair' : 'Repairs'}
          </span>
        ),
      },
      {
        id: 'downtime',
        header: 'Downtime',
        size: 165,
        minSize: 110,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <StatusBadge
            value="critical"
            label={`${row.original.totalDowntimeDays} ${row.original.totalDowntimeDays === 1 ? 'Day' : 'Days'}`}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 58,
        minSize: 58,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <RowAction
            label="Flag for Disposal"
            icon={Flag}
            destructive
            onClick={() => onFlag(row.original)}
          />
        ),
      },
    ],
    [onFlag]
  );
}

/**
 * Reported issues waiting on IT, sat beside high-maintenance assets: one says
 * what needs doing now, the other what keeps needing doing.
 */
export function usePendingMaintenanceColumns(): ColumnDef<PendingMaintenanceRow>[] {
  const router = useRouter();

  return useMemo(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        size: 132,
        minSize: 120,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.assetName} ({row.original.assetTag})
          </span>
        ),
      },
      {
        id: 'issue',
        header: 'Reported Issue',
        size: 146,
        minSize: 128,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.reportedIssue}
          </span>
        ),
      },
      {
        id: 'reportedBy',
        header: 'Reported By',
        size: 125,
        minSize: 110,
        cell: ({ row }) => (
          <EmployeeCell
            name={row.original.reportedBy}
            email={row.original.reportedByEmail}
          />
        ),
      },
      {
        // Short header on purpose: at this width "Days Pending" truncates to
        // "Days Pen..." and reads worse than the badge underneath it.
        id: 'daysPending',
        header: 'Days',
        size: 80,
        minSize: 76,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <StatusBadge
            value={getDaysPendingStatus(row.original.daysPending)}
            label={`${row.original.daysPending}d`}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 55,
        minSize: 55,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <RowAction
            label="Review"
            icon={ArrowUpRight}
            onClick={() =>
              router.push(
                `/operations/maintenance?panel=review&id=${row.original.ticketId}`
              )
            }
          />
        ),
      },
    ],
    [router]
  );
}

export function useTopHighValueAssetsColumns(
  currencyCode: string = 'LKR',
  exchangeRate: number = 1
): ColumnDef<TopHighValueAssetRow>[] {
  return useMemo(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        size: 180,
        minSize: 150,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground">
            {row.original.assetName} ({row.original.assetTag})
          </span>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        size: 140,
        minSize: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.location}
          </span>
        ),
      },
      {
        id: 'originalCost',
        header: 'Original Cost',
        size: 140,
        minSize: 120,
        cell: ({ row }) => {
          const val = row.original.originalCost;
          if (val === null || val === undefined) return '—';
          const converted = val * exchangeRate;
          return (
            <span className="text-xs text-muted-foreground">
              {formatMoneyByCurrency(converted, currencyCode)}
            </span>
          );
        },
      },
      {
        id: 'currentBookValue',
        header: 'Current Book Value',
        size: 140,
        minSize: 120,
        cell: ({ row }) => {
          const val = row.original.currentBookValue;
          if (val === null || val === undefined) return '—';
          const converted = val * exchangeRate;
          return (
            <span className="text-xs font-bold text-emerald-600">
              {formatMoneyByCurrency(converted, currencyCode)}
            </span>
          );
        },
      },
    ],
    [currencyCode, exchangeRate]
  );
}

export function useDepreciationColumns(
  currencyCode: string = 'LKR',
  apiRates?: Record<string, number>
): ColumnDef<DepreciationLedgerRow>[] {
  return useMemo(
    () => [
      {
        id: 'asset',
        header: 'Asset Tag',
        size: 140,
        minSize: 120,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground">
            {row.original.assetId}
          </span>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        size: 140,
        minSize: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.category}
          </span>
        ),
      },
      {
        id: 'purchaseDate',
        header: 'Purchase Date',
        size: 140,
        minSize: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            <DateFormatted date={row.original.purchaseDate} fallback="-" />
          </span>
        ),
      },
      {
        id: 'originalCost',
        header: 'Original Cost',
        size: 140,
        minSize: 120,
        cell: ({ row }) => {
          const converted = convertCurrencyAmount(
            row.original.originalPrice,
            row.original.currencyCode,
            currencyCode,
            apiRates
          );
          return (
            <span className="text-xs text-muted-foreground font-medium">
              {formatMoneyByCurrency(converted, currencyCode)}
            </span>
          );
        },
      },
      {
        id: 'currentBookValue',
        header: 'Net Book Value',
        size: 140,
        minSize: 120,
        cell: ({ row }) => {
          const converted = convertCurrencyAmount(
            row.original.currentBookValue,
            row.original.currencyCode,
            currencyCode,
            apiRates
          );
          return (
            <span className="text-xs font-bold text-emerald-600">
              {formatMoneyByCurrency(converted, currencyCode)}
            </span>
          );
        },
      },
      {
        id: 'lifespan',
        header: 'Useful Life',
        size: 140,
        minSize: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.expectedLifespan}
          </span>
        ),
      },
    ],
    [currencyCode, apiRates]
  );
}

export function useWriteOffsColumns(
  currencyCode: string = 'LKR',
  apiRates?: Record<string, number>
): ColumnDef<WriteOffLedgerRow>[] {
  return useMemo(
    () => [
      {
        id: 'asset',
        header: 'Asset Tag',
        size: 140,
        minSize: 120,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground">
            {row.original.assetId}
          </span>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        size: 140,
        minSize: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.category}
          </span>
        ),
      },
      {
        id: 'disposalDate',
        header: 'Disposal Date',
        size: 150,
        minSize: 130,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            <DateFormatted date={row.original.disposalDate} fallback="-" />
          </span>
        ),
      },
      {
        id: 'originalCost',
        header: 'Original Cost',
        size: 130,
        minSize: 110,
        cell: ({ row }) => {
          const converted = convertCurrencyAmount(
            row.original.originalPrice,
            row.original.currencyCode,
            currencyCode,
            apiRates
          );
          return (
            <span className="text-xs text-muted-foreground font-medium">
              {formatMoneyByCurrency(converted, currencyCode)}
            </span>
          );
        },
      },
      {
        id: 'bookValue',
        header: 'Value at Disposal',
        size: 130,
        minSize: 110,
        cell: ({ row }) => {
          const converted = convertCurrencyAmount(
            row.original.bookValue,
            row.original.currencyCode,
            currencyCode,
            apiRates
          );
          return (
            <span className="text-xs text-muted-foreground">
              {formatMoneyByCurrency(converted, currencyCode)}
            </span>
          );
        },
      },
      {
        id: 'estimatedSalvageValue',
        header: 'Estimated Salvage',
        size: 140,
        minSize: 120,
        cell: ({ row }) => {
          const converted = convertCurrencyAmount(
            row.original.estimatedSalvageValue,
            row.original.currencyCode,
            currencyCode,
            apiRates
          );
          return (
            <span className="text-xs text-muted-foreground font-medium">
              {formatMoneyByCurrency(converted, currencyCode)}
            </span>
          );
        },
      },
      {
        id: 'actualSalvageValue',
        header: 'Actual Salvage',
        size: 140,
        minSize: 120,
        cell: ({ row }) => {
          const converted = convertCurrencyAmount(
            row.original.actualSalvageValue,
            row.original.currencyCode,
            currencyCode,
            apiRates
          );
          return (
            <span className="text-xs font-bold text-emerald-600">
              {formatMoneyByCurrency(converted, currencyCode)}
            </span>
          );
        },
      },
    ],
    [currencyCode, apiRates]
  );
}

export function useSoftwareOptimizationColumns(
  currencyCode: string = 'LKR',
  exchangeRate: number = 1
): ColumnDef<SoftwareOptimizationRow>[] {
  return useMemo(
    () => [
      {
        id: 'productName',
        header: 'Software Product',
        size: 180,
        minSize: 160,
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground">
            {row.original.productName}
          </span>
        ),
      },
      {
        id: 'seats',
        header: 'Seats (Idle / Total)',
        size: 140,
        minSize: 120,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            <span className="text-red-500 font-bold">
              {row.original.idleSeats}
            </span>{' '}
            / {row.original.totalSeats}
          </span>
        ),
      },
      {
        id: 'costPerSeat',
        header: 'Cost Per Seat',
        size: 140,
        minSize: 120,
        cell: ({ row }) => {
          const converted = row.original.costPerSeat * exchangeRate;
          return (
            <span className="text-xs text-muted-foreground">
              {formatMoneyByCurrency(converted, currencyCode)}
            </span>
          );
        },
      },
      {
        id: 'leak',
        header: 'Monthly Waste Leak',
        size: 140,
        minSize: 120,
        cell: ({ row }) => {
          const converted = row.original.monthlyLeak * exchangeRate;
          return (
            <span className="text-xs font-extrabold text-red-600">
              {formatMoneyByCurrency(converted, currencyCode)}
            </span>
          );
        },
      },
    ],
    [currencyCode, exchangeRate]
  );
}
