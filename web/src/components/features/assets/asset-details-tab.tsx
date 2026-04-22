'use client';

import React from 'react';
import Image from 'next/image';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceEvent } from '@/actions/assets';

export interface AssetDetailsTabProps {
  assetTag: string;
  imageUrl?: string;
  status: 'Available' | 'Assigned' | 'In Repair' | 'Defective' | 'Lost' | 'Retired' | 'Disposed' | string;
  note?: string;
  fields: { label: string; value: React.ReactNode }[];
  maintenanceRecords?: MaintenanceEvent[];
  hideMaintenance?: boolean;
  onQRCodeClick?: () => void;
  onViewAllMaintenance?: () => void;
  className?: string;
}

const statusColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Available: { bg: 'bg-white', border: 'border-green-500', text: 'text-green-700', dot: 'bg-green-500' },
  Assigned: { bg: 'bg-white', border: 'border-slate-600', text: 'text-slate-900', dot: 'bg-slate-600' },
  'In Repair': { bg: 'bg-white', border: 'border-purple-400', text: 'text-purple-700', dot: 'bg-purple-500' },
  Defective: { bg: 'bg-white', border: 'border-red-400', text: 'text-red-600', dot: 'bg-red-500' },
  Lost: { bg: 'bg-white', border: 'border-orange-400', text: 'text-orange-600', dot: 'bg-orange-500' },
  Fair: { bg: 'bg-white', border: 'border-slate-600', text: 'text-slate-900', dot: 'bg-slate-600' },
  Expired: { bg: 'bg-white', border: 'border-red-500', text: 'text-red-500', dot: 'hidden' },
};

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
  const statusColor = statusColors[status] || { bg: 'bg-white', border: 'border-slate-600', text: 'text-slate-900', dot: 'bg-slate-600' };

  return (
    <div className={cn('flex flex-col items-start gap-[18px] w-full text-[14px] text-slate-900', className)}>
      
      {/* Image and Status */}
      <div className="flex flex-col items-center w-full gap-[10px] mt-2">
        <Image
          src={imageUrl || '/asset-placeholder.png'}
          alt="Asset Image"
          width={153}
          height={121}
          className="object-cover"
        />
        
        <div
          className={cn(
            'h-[22px] rounded-lg border px-[6px] py-[2px]',
            'flex items-center justify-center gap-[4px] text-[12px] font-medium leading-[16px]',
            statusColor.bg,
            statusColor.border,
            statusColor.text
          )}
        >
          <div className={cn('w-[12px] h-[11px] rounded-full', statusColor.dot)} />
          <span>{status}</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="w-full mt-4">
        <dl className="grid grid-cols-[169px_169px_100px_104px] gap-[10px] items-start text-[14px] leading-[20px]">
          {fields.map((item, index) => (
            <React.Fragment key={index}>
              <dt className="font-medium text-slate-900">{item.label}</dt>
              <dd className="font-light text-slate-900">{item.value || '-'}</dd>
            </React.Fragment>
          ))}
          
          <React.Fragment>
             <dt className="font-medium text-slate-900">Asset Tag :</dt>
             <dd className="flex items-center gap-2 font-light">
               <button
                   onClick={onQRCodeClick}
                   className="h-[34px] px-[16px] py-[8px] rounded-lg bg-slate-100 flex items-center justify-center gap-[10px] font-medium text-slate-900 w-[104px] hover:bg-slate-200 transition-colors"
               >
                   <QrCode size={24} />
                   <span>QR Code</span>
               </button>
             </dd>
          </React.Fragment>

          {note && (
             <React.Fragment>
                <dt className="font-medium text-slate-900">Note :</dt>
                <dd className="font-light text-slate-900">{note}</dd>
             </React.Fragment>
          )}
        </dl>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-slate-200 my-2" />

      {/* Maintenance Records Summary Card */}
      {!hideMaintenance && (
        <div className="flex flex-col gap-[12px] w-full">
          <h3 className="text-[16px] font-medium leading-[24px] text-slate-900">Audit & Repair Records</h3>
          
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-[24px] flex flex-col gap-[24px] w-full shadow-[0px_1px_3px_rgba(0,0,0,0.1)]">
            {maintenanceRecords.length > 0 ? (
              <>
                <dl className="grid grid-cols-[165px_1fr] gap-[10px] text-[14px] leading-[20px]">
                  {maintenanceRecords.slice(0, 3).map((record) => (
                    <React.Fragment key={record.id}>
                      <dt className="font-medium text-slate-900">
                        {new Date(record.createdAt).toLocaleDateString('en-GB')} :
                      </dt>
                      <dd className="font-light text-slate-900">{record.description}</dd>
                    </React.Fragment>
                  ))}
                </dl>

                {maintenanceRecords.length > 3 && (
                   <div className="flex flex-col gap-[10px] text-[14px]">
                     <div className="font-medium text-slate-900">Note :</div>
                     <div className="flex flex-col gap-[10px]">
                       <button
                         onClick={onViewAllMaintenance}
                         className="font-light text-blue-500 hover:text-blue-600 text-left underline w-fit leading-[20px]"
                       >
                         View all maintenance records
                       </button>
                     </div>
                   </div>
                )}
              </>
            ) : (
              <p className="text-[14px] font-light text-slate-500">No maintenance records found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}