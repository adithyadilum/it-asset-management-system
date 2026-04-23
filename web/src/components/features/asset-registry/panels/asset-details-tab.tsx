'use client';

import React from 'react';
import Image from 'next/image';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceEvent } from '@/lib/data/asset-details-repo';
import { StatusBadge } from '@/components/shared/status-badge';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { Textarea } from '@/components/ui/textarea';

export interface AssetDetailsTabProps {
  assetTag: string;
  imageUrl?: string;
  status: string;
  note?: string;
  fields: { label: string; value: React.ReactNode }[];
  maintenanceRecords?: MaintenanceEvent[];
  hideMaintenance?: boolean;
  onQRCodeClick?: () => void;
  onViewAllMaintenance?: () => void;
  className?: string;
}

export function AssetDetailsTab({
  imageUrl,
  status,
  note,
  fields,
  maintenanceRecords = [],
  hideMaintenance = false,
  onQRCodeClick,
  onViewAllMaintenance,
  className = '',
}: AssetDetailsTabProps) {
  const hasImage = typeof imageUrl === 'string' && imageUrl.trim().length > 0;

  return (
    <div className={cn('flex w-full flex-col items-start gap-4 text-sm text-foreground', className)}>

      {/* Image and Status */}
      <div className="mt-2 flex w-full flex-col items-center gap-2.5">
        {hasImage ? (
          <Image
            src={imageUrl}
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

        <StatusBadge value={status} showIcon />
      </div>

      {/* Details Grid */}
      <div className="mt-4 grid w-full grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
        {fields.map((item, index) => {
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

        <div className="flex items-center justify-between border-b border-border/40 py-2.5">
          <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-slate-500')}>
            Asset Tag
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onQRCodeClick}
              className="flex h-8 w-fit items-center justify-center gap-2.5 rounded-lg bg-muted px-4 py-2 font-medium text-foreground transition-colors hover:bg-accent"
            >
              <QrCode size={18} />
              <span className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>QR Code</span>
            </button>
          </div>
        </div>

        {note && (
          <div className="col-span-full mt-4 space-y-2">
            <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-slate-500')}>
              Note
            </div>
            <Textarea
              readOnly
              value={note}
              className="min-h-[100px] w-full resize-none bg-muted/30 text-slate-900 focus-visible:ring-0"
            />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="my-2 h-px w-full bg-border" />

      {/* Maintenance Records Summary Card */}
      {!hideMaintenance && (
        <div className="flex w-full flex-col gap-3">
          <h3 className="text-base font-medium leading-6 text-foreground">Audit & Repair Records</h3>

          <div className="flex w-full flex-col gap-6 rounded-lg border border-border bg-muted/50 p-6 shadow-sm">
            {maintenanceRecords.length > 0 ? (
              <>
                <dl className="grid grid-cols-[minmax(140px,auto)_1fr] gap-2.5 text-sm leading-5">
                  {maintenanceRecords.slice(0, 3).map((record) => (
                    <React.Fragment key={record.id}>
                      <dt className="font-medium text-foreground">
                        {new Date(record.createdAt).toLocaleDateString('en-GB')}
                      </dt>
                      <dd className="font-light text-foreground">{record.description}</dd>
                    </React.Fragment>
                  ))}
                </dl>

                {maintenanceRecords.length > 3 && (
                  <div className="flex flex-col gap-2.5 text-sm">
                    <div className="font-medium text-foreground">Note</div>
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={onViewAllMaintenance}
                        className="w-fit text-left font-light text-primary underline transition-colors hover:text-primary/80"
                      >
                        View all maintenance records
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm font-light text-muted-foreground">No maintenance records found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}