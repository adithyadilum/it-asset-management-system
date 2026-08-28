'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DateFormatted } from '@/components/shared/formatters';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatMoneyByCurrency, convertCurrencyAmount } from '@/lib/currency';
import { ArrowUpRight } from 'lucide-react';
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

export function EmployeeCell({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px] font-semibold bg-muted">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-none">
        <span className="text-xs font-semibold text-foreground">{name}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">
          {email}
        </span>
      </div>
    </div>
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
        size: 180,
        minSize: 160,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <EmployeeCell
            name={row.original.employeeName}
            email={row.original.employeeEmail}
          />
        ),
      },
      {
        id: 'department',
        header: 'Department',
        size: 130,
        minSize: 110,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.department || '—'}
          </span>
        ),
      },
      {
        id: 'asset',
        header: 'Asset',
        size: 180,
        minSize: 150,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.assetName} ({row.original.assetTag})
          </span>
        ),
      },
      {
        id: 'expectedReturnDate',
        header: 'Due Date',
        size: 130,
        minSize: 110,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            <DateFormatted date={row.original.expectedReturnDate} />
          </span>
        ),
      },
      {
        id: 'daysOverdue',
        header: 'Days Overdue',
        size: 130,
        minSize: 110,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <StatusBadge
            value="critical"
            label={`${row.original.daysOverdue} ${row.original.daysOverdue === 1 ? 'Day' : 'Days'}`}
          />
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 140,
        minSize: 120,
        meta: { noTruncate: true },
        cell: ({ row }) => {
          const isSending = sendingReminderIds.includes(
            row.original.assignmentId
          );
          return (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs px-3 transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm active:scale-95"
              onClick={() => onSendReminder(row.original)}
              disabled={isSending}
            >
              {isSending ? 'Sending...' : actionLabel}
            </Button>
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
        size: 180,
        minSize: 160,
        meta: { noTruncate: true },
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
        size: 180,
        minSize: 150,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.assetName} ({row.original.assetTag})
          </span>
        ),
      },
      {
        id: 'daysPending',
        header: 'Days Pending',
        size: 130,
        minSize: 110,
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
        header: 'Actions',
        size: 150,
        minSize: 130,
        meta: { noTruncate: true },
        cell: ({ row }) => {
          if (userRole === 'FinancialAuditor') {
            return (
              <span className="text-xs text-muted-foreground italic">
                Awaiting Admin Sign-Off
              </span>
            );
          }
          return (
            <Button
              variant="secondary"
              size="sm"
              className="group h-7 text-xs px-3 transition-all hover:bg-destructive hover:text-destructive-foreground hover:shadow-sm active:scale-95 inline-flex items-center gap-1"
              onClick={() =>
                router.push(
                  `/operations/disposals?panel=review&id=${row.original.disposalId}`
                )
              }
            >
              Take Action
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:translate-y-0 transition-all duration-200" />
            </Button>
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
        size: 180,
        minSize: 150,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.assetName} ({row.original.assetTag})
          </span>
        ),
      },
      {
        id: 'repairCount',
        header: 'Repair Count',
        size: 120,
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
        header: 'Total Downtime',
        size: 130,
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
        header: 'Actions',
        size: 140,
        minSize: 120,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs px-3 transition-all hover:bg-destructive hover:text-destructive-foreground hover:shadow-sm active:scale-95"
            onClick={() => onFlag(row.original)}
          >
            Flag for Disposal
          </Button>
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
        size: 170,
        minSize: 140,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.assetName} ({row.original.assetTag})
          </span>
        ),
      },
      {
        id: 'issue',
        header: 'Reported Issue',
        size: 200,
        minSize: 160,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.reportedIssue}
          </span>
        ),
      },
      {
        id: 'reportedBy',
        header: 'Reported By',
        size: 170,
        minSize: 150,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <EmployeeCell
            name={row.original.reportedBy}
            email={row.original.reportedByEmail}
          />
        ),
      },
      {
        id: 'daysPending',
        header: 'Days Pending',
        size: 120,
        minSize: 110,
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
        header: 'Actions',
        size: 140,
        minSize: 120,
        meta: { noTruncate: true },
        cell: ({ row }) => (
          <Button
            variant="secondary"
            size="sm"
            className="group h-7 text-xs px-3 transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm active:scale-95 inline-flex items-center gap-1"
            onClick={() =>
              router.push(
                `/operations/maintenance?panel=review&id=${row.original.ticketId}`
              )
            }
          >
            Review
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:translate-y-0 transition-all duration-200" />
          </Button>
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
