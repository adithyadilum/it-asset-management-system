'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { PillarBadge } from '@/components/shared/pillar-badge';
import { SoftwareExpiryStatus } from '@/components/shared/software-expiry-status';
import { CopyableField } from '@/components/shared/copyable-field';
import type { RegistryView } from './registry-config';
import type { AssetRegistryRow } from './asset-registry-client';

export interface ManualStatus {
  value: string;
  label: string;
  colorTheme?: string;
  iconName?: string;
}

const ELECTRONICS_CONDITION_STYLES: Record<string, string> = {
  Active: 'border border-green-300 bg-green-50 text-green-700',
  'Inspection Due': 'border border-blue-300 bg-blue-50 text-blue-700',
  'Under Maintenance': 'border border-orange-300 bg-orange-50 text-orange-700',
  Scheduled: 'border border-border bg-muted text-foreground',
};

function toElectronicsDisplayCondition(row: AssetRegistryRow) {
  if (row.condition) {
    return row.condition;
  }

  if (row.status === 'Available') {
    return 'Active';
  }

  if (row.status === 'Assigned') {
    return 'Scheduled';
  }

  if (row.status === 'In Repair') {
    return 'Under Maintenance';
  }

  if (row.status === 'Defective') {
    return 'Inspection Due';
  }

  return 'Scheduled';
}

function toCellText(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return '-';
  }

  return value;
}

function renderElectronicsConditionBadge(condition: string) {
  const className =
    ELECTRONICS_CONDITION_STYLES[condition] ??
    'border border-border bg-muted text-foreground';

  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${className}`}
    >
      {condition}
    </span>
  );
}

export function useAssetColumns(
  view: RegistryView,
  manualStatuses: ManualStatus[] = []
): ColumnDef<AssetRegistryRow>[] {
  return useMemo<ColumnDef<AssetRegistryRow>[]>(() => {
    if (view === 'unified') {
      return [
        { accessorKey: 'assetTag', header: 'Asset ID' },
        {
          accessorKey: 'name',
          header: 'Item Name',
          cell: ({ row }) => toCellText(row.original.name),
        },
        {
          accessorKey: 'category',
          header: 'Category',
          cell: ({ row }) => toCellText(row.original.category),
        },
        {
          accessorKey: 'pillar',
          header: 'Pillar',
          cell: ({ row }) => <PillarBadge pillar={row.original.pillar} />,
        },
        {
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => {
            if (row.original.pillar === 'Software') {
              return <SoftwareExpiryStatus status={row.original.status} expiryDate={row.original.expiryDate} />;
            }
            return <StatusBadge value={row.original.status} showIcon />;
          },
        },
        {
          id: 'assignment',
          header: 'Assignment',
          cell: ({ row }) => {
            if (row.original.pillar === 'Software') {
              const coreTotal = row.original.totalSeats || 0;
              const attrTotal = parseInt(String(row.original.instanceAttributes?.['total_seats'] ?? row.original.instanceAttributes?.['Total Seats'] ?? row.original.instanceAttributes?.['max_seats'] ?? '0'), 10);
              const total = coreTotal > 0 ? coreTotal : (isNaN(attrTotal) ? 0 : attrTotal);
              const available = coreTotal > 0 ? (row.original.availableSeats ?? 0) : total;
              const assigned = Math.max(0, total - available);
              return (
                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-muted text-foreground ring-border whitespace-nowrap">
                  {assigned} / {total} Assigned
                </span>
              );
            }
            return toCellText(row.original.assignedTo || row.original.location);
          },
          enableSorting: false,
        },
      ];
    }

    if (view === 'furniture') {
      return [
        { accessorKey: 'assetTag', header: 'Asset ID' },
        {
          accessorKey: 'name',
          header: 'Asset Name',
          cell: ({ row }) => toCellText(row.original.name),
        },
        {
          accessorKey: 'location',
          header: 'Location',
          cell: ({ row }) => toCellText(row.original.location),
        },
        {
          accessorKey: 'condition',
          header: 'Condition',
          cell: ({ row }) => (
            <StatusBadge value={row.original.condition ?? 'New'} showIcon />
          ),
        },
      ];
    }

    if (view === 'office-electronics') {
      return [
        { accessorKey: 'assetTag', header: 'Asset ID' },
        {
          accessorKey: 'name',
          header: 'Asset Name',
          cell: ({ row }) => toCellText(row.original.name),
        },
        {
          accessorKey: 'location',
          header: 'Location',
          cell: ({ row }) => toCellText(row.original.location),
        },
        {
          id: 'ipOrMacAddress',
          header: 'IP/MAC Address',
          cell: ({ row }) => String(row.original.instanceAttributes?.['IP/MAC Address'] ?? '-'),
          enableSorting: false,
        },
        {
          id: 'electronicsCondition',
          header: 'Condition',
          cell: ({ row }) =>
            renderElectronicsConditionBadge(toElectronicsDisplayCondition(row.original)),
          enableSorting: false,
        },
      ];
    }

    if (view === 'software') {
      return [
        {
          accessorKey: 'assetTag',
          header: 'Asset ID',
        },
        {
          accessorKey: 'name',
          header: 'Software Name',
          cell: ({ row }) => toCellText(row.original.name),
        },
        {
          accessorKey: 'serialNumber',
          header: 'License Key',
          cell: ({ row }) => {
            const serialNumber =
              row.original.serialNumber ||
              String(row.original.instanceAttributes?.['license_key'] ?? row.original.instanceAttributes?.['License Key'] ?? '');

            if (!serialNumber || serialNumber === '-') return '-';

            return (
              <div className="flex w-full pr-2">
                <CopyableField
                  value={serialNumber}
                  label="License Key"
                  className="w-full"
                />
              </div>
            );
          },
        },
        {
          id: 'licenseType',
          header: 'License Type',
          cell: ({ row }) => row.original.licenseType ?? '-',
          enableSorting: false,
        },
        {
          id: 'availability',
          header: 'Availability',
          cell: ({ row }) => {
            const coreTotal = row.original.totalSeats || 0;
            const coreAvailable = row.original.availableSeats;

            // Fallbacks from instance attributes
            const attrTotal = parseInt(String(row.original.instanceAttributes?.['total_seats'] ?? row.original.instanceAttributes?.['Total Seats'] ?? row.original.instanceAttributes?.['max_seats'] ?? '0'), 10);

            const total = coreTotal > 0 ? coreTotal : (isNaN(attrTotal) ? 0 : attrTotal);
            // Crude fallback for availability if coreTotal is 0
            const available = coreTotal > 0 ? (coreAvailable ?? 0) : total;

            const isLow = total > 0 && available <= 2;

            if (row.original.pillar !== 'Software') return null;

            return (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${available === 0
                  ? 'bg-red-50 text-red-700 ring-red-600/10'
                  : isLow
                    ? 'bg-amber-50 text-amber-700 ring-amber-600/10'
                    : 'bg-green-50 text-green-700 ring-green-600/10'
                  }`}>
                  {available} / {total} Available
                </span>
              </div>
            );
          },
          enableSorting: false,
        },
        {
          id: 'expirationDate',
          header: 'Expiration Date',
          cell: ({ row }) => {
            const coreExpiry = row.original.expiryDate;
            const attrExpiry = String(row.original.instanceAttributes?.['expiry_date'] ?? row.original.instanceAttributes?.['Expiration Date'] ?? row.original.instanceAttributes?.['license_expiry'] ?? '');

            const expiryStr = coreExpiry || attrExpiry;
            if (!expiryStr || expiryStr === 'null') return '-';

            const expiryDate = new Date(expiryStr);
            const today = new Date();
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let colorClass = 'text-muted-foreground';
            if (diffDays <= 0) {
              colorClass = 'text-red-600 font-medium';
            } else if (diffDays <= 30) {
              colorClass = 'text-amber-600 font-medium';
            }

            return (
              <span className={colorClass}>
                {expiryDate.toLocaleDateString()}
              </span>
            );
          },
          enableSorting: false,
        },
      ];
    }

    return [
      { accessorKey: 'assetTag', header: 'Asset ID' },
      {
        accessorKey: 'name',
        header: 'Asset Name',
        cell: ({ row }) => toCellText(row.original.name),
      },
      {
        accessorKey: 'serialNumber',
        header: 'Serial Number',
        cell: ({ row }) => toCellText(row.original.serialNumber),
      },
      {
        accessorKey: 'assignedTo',
        header: 'Assigned to',
        cell: ({ row }) => toCellText(row.original.assignedTo),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const statusConfig = manualStatuses.find(s => s.value === row.original.status);
          return (
            <StatusBadge
              value={row.original.status}
              showIcon
              colorTheme={statusConfig?.colorTheme}
              iconName={statusConfig?.iconName}
            />
          );
        },
      },
    ];
  }, [view, manualStatuses]);
}
