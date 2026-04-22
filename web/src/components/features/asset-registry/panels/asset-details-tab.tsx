'use client';

import React from 'react';
import Image from 'next/image';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceEvent } from '@/lib/data/asset-details-repo';
import { StatusBadge } from '@/components/shared/status-badge';

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
  assetTag,
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
  return (
    <div className={cn('flex w-full flex-col items-start gap-4 text-sm text-foreground', className)}>
      
      {/* Image and Status */}
      <div className="mt-2 flex w-full flex-col items-center gap-2.5">
        <Image
          src={imageUrl || '/asset-placeholder.png'}
          alt="Asset Image"
          width={153}
          height={121}
          className="object-cover"
        />
        
        <StatusBadge value={status} showIcon />
      </div>

      {/* Details Grid */}
      <div className="mt-4 w-full">
        <dl className="grid grid-cols-[minmax(140px,auto)_1fr] gap-2.5 text-sm leading-5">
          {fields.map((item, index) => (
            <React.Fragment key={index}>
              <dt className="font-medium text-foreground">{item.label}</dt>
              <dd className="font-light text-foreground">{item.value || '-'}</dd>
            </React.Fragment>
          ))}
          
          <React.Fragment>
             <dt className="font-medium text-foreground">Asset Tag</dt>
             <dd className="flex items-center gap-2 font-light">
               <button
                   onClick={onQRCodeClick}
                   className="flex h-8 w-fit items-center justify-center gap-2.5 rounded-lg bg-muted px-4 py-2 font-medium text-foreground transition-colors hover:bg-accent"
               >
                   <QrCode size={24} />
                   <span>QR Code</span>
               </button>
             </dd>
          </React.Fragment>

          {note && (
             <React.Fragment>
                <dt className="font-medium text-foreground">Note</dt>
                <dd className="font-light text-foreground">{note}</dd>
             </React.Fragment>
          )}
        </dl>
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