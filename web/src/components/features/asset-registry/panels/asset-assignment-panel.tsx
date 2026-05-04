'use client';

import Image from 'next/image';
import React, { useMemo } from 'react';
import { AssetLoadingSkeleton } from './asset-loading-skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QrCode, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceEvent } from '@/lib/data/asset-details-repo';

export interface AssetAssignmentPanelProps {
  isLoading?: boolean;
  assetId: string;
  assetTag: string;
  category: string;
  model: string;
  brand: string;
  serialNumber: string;
  owner: string;
  assignedTo: string;
  group: string;
  dateCreated: string;
  updatedAt: string;
  warranty: string;
  lastRepaired: string;
  note: string;
  status: string;
  imageUrl?: string;
  maintenanceEvents?: MaintenanceEvent[];
  onEdit?: () => void;
  onAssign?: () => void;
  onClose?: () => void;
}

function formatDateValue(value: string) {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-GB');
}

export function AssetAssignmentDetailsPanel(props: AssetAssignmentPanelProps) {
  const detailsRows = useMemo(() => [
      {
        left: { label: 'Asset ID :', value: props.assetTag || '-' },
        right: { label: 'Category :', value: props.category || '-' },
      },
      {
        left: { label: 'Model :', value: props.model || '-' },
        right: { label: 'Brand :', value: props.brand || '-' },
      },
      {
        left: { label: 'Serial Number :', value: props.serialNumber || '-' },
        right: { label: 'Owner :', value: props.owner || '-' },
      },
      {
        left: { label: 'Assigned to :', value: props.assignedTo || '-' },
        right: { label: 'Group :', value: props.group || '-' },
      },
      {
        left: { label: 'Date Created :', value: props.dateCreated || '-' },
        right: {
          label: 'Warranty :',
          value: (
            <Badge
              variant="outline"
              className={cn(
                'h-5 rounded-full px-2 text-[11px] font-medium',
                props.warranty === 'Expired'
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-blue-200 bg-blue-50 text-blue-600'
              )}
            >
              {props.warranty || '-'}
            </Badge>
          ),
        },
      },
      {
        left: { label: 'Updated at :', value: props.updatedAt || '-' },
        right: { label: 'Last Repaired :', value: props.lastRepaired || '-' },
      },
      {
        left: { label: 'Note :', value: props.note || '-' },
        right: {
          label: 'Asset Tag :',
          value: (
            <Badge
              variant="secondary"
              className="h-8 gap-1 rounded-lg bg-slate-100 px-3 font-medium text-slate-700 hover:bg-slate-100"
            >
              <QrCode className="size-3.5" />
              {props.assetTag || 'QR Code'}
            </Badge>
          ),
        },
      },
    ], [props]);

  const maintenanceSummary = props.maintenanceEvents?.[0]?.reportedIssue || 'No maintenance notes available.';

  if (props.isLoading) return <AssetLoadingSkeleton />;

  return (
    <aside className="relative flex h-full w-[clamp(520px,36vw,684px)] min-w-[520px] max-w-[684px] flex-none flex-col overflow-x-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {props.onClose ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 top-3 z-10 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          onClick={props.onClose}
          aria-label="Close panel"
        >
          <XIcon />
        </Button>
      ) : null}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-6 p-6 pb-2 pr-12">
          {/* Asset Image and Status */}
          <div className="flex w-full flex-col items-center gap-2 pt-1">
            <Image
              src={props.imageUrl || '/asset-placeholder.png'}
              alt="Asset Image"
              width={170}
              height={126}
              className="h-auto w-[170px] object-contain"
            />
            <StatusBadge value={props.status} showIcon className="h-6 rounded-full px-2 text-[12px]" />
          </div>

          {/* Details Rows */}
          <div className="space-y-3">
            {detailsRows.map((row, index) => (
              <div key={`assignment-row-${index}`} className={cn(
                "grid grid-cols-2 gap-x-8",
                row.left.label === 'Assigned to :' && 'bg-blue-50 rounded-lg p-3 border border-blue-200'
              )}>
                <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-x-3">
                  <p className={cn(
                    "font-medium text-slate-900",
                    row.left.label === 'Assigned to :' && 'text-blue-900 font-semibold'
                  )}>{row.left.label}</p>
                  <div className={cn(
                    "text-slate-700",
                    row.left.label === 'Assigned to :' && 'text-blue-900 font-semibold'
                  )}>{row.left.value}</div>
                </div>
                <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-x-3">
                  <p className="font-medium text-slate-900">{row.right.label}</p>
                  <div className="text-slate-700">{row.right.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Maintenance Records */}
          <div className="space-y-4">
            <h3 className="text-[18px] font-semibold leading-9 text-slate-900">Maintenance Records</h3>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              {props.maintenanceEvents && props.maintenanceEvents.length > 0 ? (
                <dl className="space-y-2">
                  {props.maintenanceEvents.slice(0, 3).map((record) => (
                    <div key={record.id} className="grid grid-cols-[145px_minmax(0,1fr)] gap-x-5">
                      <dt className="font-semibold text-slate-900">{formatDateValue(record.estimatedReturnDate || record.createdAt)} :</dt>
                      <dd className="text-slate-700">{record.reportedIssue || '-'}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-slate-600">No maintenance records found.</p>
              )}

              <div className="mt-6 space-y-3">
                <p className="font-semibold text-slate-900">Note :</p>
                <p className="text-slate-700">{maintenanceSummary}</p>
                <button
                  type="button"
                  className="text-[15px] text-[#4A80FF] underline decoration-[#4A80FF] underline-offset-2 hover:text-[#3b6ce0]"
                >
                  View all maintenance records
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Buttons at Bottom */}
      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white p-6 rounded-b-xl">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-lg border-slate-200 px-4 text-sm"
          onClick={props.onEdit}
        >
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-lg bg-[#0B1D74] px-4 text-sm text-white hover:bg-[#0A175C]"
          onClick={props.onAssign}
        >
          Assign
        </Button>
      </div>
    </aside>
  );
}