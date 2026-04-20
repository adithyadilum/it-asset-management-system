'use client';

import React from 'react';
import Image from 'next/image';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AssetDetailsTabProps {
  assetId: string;
  assetTag: string;
  category: string;
  model: string;
  brand: string;
  serialNumber?: string;
  owner?: string;
  group?: string;
  warranty?: string;
  lastRepaired?: string;
  dateCreated: string;
  updatedAt: string;
  note?: string;
  imageUrl?: string;
  status: 'Available' | 'Assigned' | 'In Repair' | 'Defective' | 'Lost' | 'Retired' | 'Disposed';
  onQRCodeClick?: () => void;
  className?: string;
}

const statusColors = {
  Available: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  Assigned: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  'In Repair': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  Defective: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  Lost: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', dot: 'bg-gray-500' },
  Retired: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
  Disposed: { bg: 'bg-zinc-50', border: 'border-zinc-200', text: 'text-zinc-700', dot: 'bg-zinc-500' },
};

export function AssetDetailsTab({
  assetId,
  assetTag,
  category,
  model,
  brand,
  serialNumber,
  owner,
  group,
  warranty,
  lastRepaired,
  dateCreated,
  updatedAt,
  note,
  imageUrl,
  status,
  onQRCodeClick,
  className = '',
}: AssetDetailsTabProps) {
  const statusColor = statusColors[status];

  return (
    <div className={cn('flex flex-col gap-6 w-full', className)}>
      {/* Image and Status */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        <div className="relative w-full max-w-[153px] h-[121px] bg-white rounded-lg border border-slate-200 flex items-center justify-center">
          <Image
            src={imageUrl || '/asset-placeholder.png'}
            alt={model}
            width={153}
            height={121}
            className="object-contain"
          />
        </div>

        <div
          className={cn(
            'h-[22px] rounded-lg border px-1.5 py-0.5',
            'flex items-center gap-1 text-xs font-medium',
            statusColor.bg,
            statusColor.border,
            statusColor.text
          )}
        >
          <div className={cn('w-2 h-2 rounded-full', statusColor.dot)} />
          <span>{status}</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
          {[
            { label: 'Asset ID :', value: assetId },
            { label: 'Category :', value: category },
            { label: 'Model :', value: model },
            { label: 'Brand :', value: brand },
            { label: 'Serial Number :', value: serialNumber || '-' },
            { label: 'Owner :', value: owner || '-' },
            { label: 'Assigned to :', value: owner || '-' },
            { label: 'Group :', value: group || '-' },
            { label: 'Date Created :', value: dateCreated },
            { label: 'Warranty :', value: warranty || '-' },
            { label: 'Updated at :', value: updatedAt },
            { label: 'Last Repaired :', value: lastRepaired || '-' },
          ].map((item, index) => (
            <React.Fragment key={index}>
              <dt className="text-sm font-medium text-slate-900">{item.label}</dt>
              <dd className="text-sm font-light text-slate-900">{item.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      {/* QR Code Button */}
      <button
        onClick={onQRCodeClick}
        className="h-[34px] px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-medium text-slate-900 w-fit"
      >
        <QrCode size={24} />
        <span>QR Code</span>
      </button>

      {/* Note Section */}
      {note && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
          <div className="text-sm font-medium text-slate-900 mb-2">Note :</div>
          <div className="text-sm font-light text-slate-900 leading-5">
            {note}
          </div>
        </div>
      )}

      {/* Asset Tag */}
      <div>
        <div className="text-sm font-medium text-slate-900">Asset Tag :</div>
        <div className="text-sm font-light text-slate-900">{assetTag}</div>
      </div>
    </div>
  );
}