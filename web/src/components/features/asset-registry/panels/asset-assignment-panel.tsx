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
import { RecentMaintenance } from './recent-maintenance';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Textarea } from '@/components/ui/textarea';

export interface AssetAssignmentPanelProps {
  isLoading?: boolean;
  assetId: string;
  assetTag: string;
  assetName?: string;
  category: string;
  model: string;
  brand: string;
  serialNumber: string;
  owner: string;
  assignedTo: string;
  department?: string;
  group: string;
  dateCreated: string;
  assignedDate?: string;
  expectedReturnDate?: string;
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
  const isAssigned = ['Assigned', 'Requested', 'Overdue'].includes(props.status);

  const detailsFields = useMemo(() => [
    { label: 'Asset ID', value: props.assetTag || '-' },
    { label: 'Category', value: props.category || '-' },
    { label: 'Model', value: props.model || '-' },
    { label: 'Brand', value: props.brand || '-' },
    { label: 'Serial Number', value: props.serialNumber || '-' },
    { label: 'Owner', value: props.owner || '-' },
    { label: 'Date Created', value: props.dateCreated || '-' },
    { 
      label: 'Warranty', 
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
      ) 
    },
    { label: 'Updated at', value: props.updatedAt || '-' },
    { label: 'Last Repaired', value: props.lastRepaired || '-' }
  ], [props]);

  const maintenanceSummary = props.maintenanceEvents?.[0]?.reportedIssue || 'No maintenance notes available.';

  if (props.isLoading) return <AssetLoadingSkeleton />;

  return (
    <aside className="relative flex h-full w-[min(700px,92vw)] flex-none flex-col overflow-x-hidden rounded-xl bg-card shadow-box-shadow-shadow-lg ml-2">
      {/* Header Area */}
      <header className="shrink-0 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn('truncate text-foreground', TYPOGRAPHY_CLASSNAMES.textLgSemiBold)}>
              {props.assetName || props.model || 'Asset'}
            </span>
            <StatusBadge
              variant="metadata"
              label={`ID: ${props.assetTag || '-'}`}
            />
            <StatusBadge value={props.status} showIcon className="h-6 rounded-full px-2 text-[12px]" />
          </div>

          {props.onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="-mr-1 -mt-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={props.onClose}
              aria-label="Close panel"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </header>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col gap-6 p-6 pt-2 pb-2 pr-12">
          {/* Asset Image */}
          <div className="flex w-full flex-col items-center gap-2.5 mt-2">
            {props.imageUrl && props.imageUrl.trim().length > 0 ? (
                <Image
                    src={props.imageUrl}
                    alt="Asset Image"
                    width={153}
                    height={121}
                    className="object-cover"
                />
            ) : (
                <div className="flex h-[121px] w-[153px] items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-center text-xs text-muted-foreground">
                    No image available
                </div>
            )}
            
            <div className="mt-1.5 flex items-center justify-center">
                <Button
                    type="button"
                    variant="outline"
                    title={props.assetTag}
                    aria-label="Asset Tag"
                    className="h-7 rounded-full border-border bg-background px-3 text-xs font-medium text-foreground shadow-none hover:bg-muted"
                >
                    <QrCode className="mr-1.5 h-3.5 w-3.5" />
                    Asset Tag
                </Button>
            </div>
          </div>

          {/* Details Rows */}
          <div className="mt-4 grid w-full grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
            {detailsFields.map((item, index) => {
              const isLongValue = typeof item.value === 'string' && item.value.length > 40;

              return (
                  <div
                      key={index}
                      className={cn(
                          'flex items-center justify-between border-b border-border/40 py-2.5',
                          isLongValue && 'col-span-full'
                      )}
                  >
                      <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'shrink-0 pr-4 text-slate-500')}>
                          {item.label}
                      </div>
                      <div
                          className={cn(
                              TYPOGRAPHY_CLASSNAMES.textSmMedium,
                              'text-right text-slate-900',
                              item.label === 'Asset ID' && 'font-mono tracking-wide'
                          )}
                      >
                          {item.value || '-'}
                      </div>
                  </div>
              );
            })}

            {props.note ? (
                <div className="col-span-full mt-4 space-y-2">
                    <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-slate-500')}>
                        Note
                    </div>
                    <Textarea
                        readOnly
                        value={props.note}
                        className="min-h-25 w-full resize-none bg-muted/30 text-slate-900 focus-visible:ring-0"
                    />
                </div>
            ) : null}
          </div>

          {isAssigned ? (
            <div className="mt-8">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Assignment Details</h3>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
                <div className="grid grid-cols-[150px_1fr] gap-y-4">
                  <p className="font-medium text-slate-900">Assigned to :</p>
                  <div className="text-slate-700">{props.assignedTo || '-'}</div>
                  
                  <p className="font-medium text-slate-900">Department :</p>
                  <div className="text-slate-700">{props.department || props.group || '-'}</div>
                  
                  <p className="font-medium text-slate-900">Assigned Date :</p>
                  <div className="text-slate-700">{props.assignedDate || '-'}</div>
                  
                  <p className="font-medium text-slate-900">Due Date :</p>
                  <div className="text-slate-700">{props.expectedReturnDate || '-'}</div>
                </div>
              </div>
            </div>
          ) : (
            props.category !== 'Software' && (
              <div className="-mx-2 mt-8">
                <RecentMaintenance 
                  assetTag={props.assetTag} 
                  isOpen={true} 
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* Sticky Action Buttons at Bottom */}
      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white p-6 rounded-b-xl">
        {isAssigned ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg border-slate-200 px-4 text-sm"
            >
              Received
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-lg bg-[#0B1D74] px-4 text-sm text-white hover:bg-[#0A175C]"
            >
              Request Return
            </Button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </aside>
  );
}