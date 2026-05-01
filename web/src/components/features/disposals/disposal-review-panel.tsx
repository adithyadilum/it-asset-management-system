'use client';

import React from 'react';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';

import { SlidePanel, type SlidePanelAction } from '@/components/shared/slide-panel';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { AssetLoadingSkeleton } from '@/components/features/asset-registry/panels/asset-loading-skeleton';

export interface DisposalReviewPanelProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  isLoading?: boolean;

  assetTag: string;
  model: string;
  serialNumber: string;
  category: string;
  brand: string;
  dateCreated: string;
  imageUrl?: string;

  requestedBy: string;
  dateRequested: string;
  reason: string;
  justification?: string;

  purchaseDate?: string;
  originalCost?: number;
  currentBookValue?: number;
  warrantyStatus?: string;

  onReject?: () => void;
  onApprove?: () => void;
}

function formatDateString(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function DetailRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="flex items-start text-sm leading-5">
      <span className={`w-40 ${bold ? 'font-semibold text-slate-900' : 'font-semibold text-slate-900'}`}>
        {label}:
      </span>
      <span className={`flex-1 ${bold ? 'font-semibold text-slate-900' : 'font-normal text-slate-600'}`}>
        {value || '-'}
      </span>
    </div>
  );
}

function WarrantyStatusBadge({
  status,
}: {
  status?: string;
}) {
  if (!status) return <span className="text-sm font-normal text-slate-600">-</span>;

  if (status === 'Expired') {
    return (
      <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
        Expired
      </span>
    );
  }

  if (status === 'Valid') {
    return (
      <span className="inline-flex items-center rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
        Valid
      </span>
    );
  }

  return <span className="text-sm font-normal text-slate-600">{status}</span>;
}

export function DisposalReviewPanel(props: DisposalReviewPanelProps) {
  const panelActions: SlidePanelAction[] = [
    {
      id: 'reject',
      label: 'Reject',
      variant: 'outline',
      onClick: props.onReject,
      disabled: props.isLoading,
    },
    {
      id: 'approve',
      label: 'Initiate Disposal',
      variant: 'destructive',
      onClick: props.onApprove,
      disabled: props.isLoading,
    },
  ];

  const panelContent = props.isLoading ? (
    <div className="p-6">
      <AssetLoadingSkeleton />
    </div>
  ) : (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Asset Image Section */}
      <div className="flex justify-center py-4">
        {props.imageUrl ? (
          <Image
            src={props.imageUrl}
            alt={props.model}
            width={192}
            height={128}
            className="h-32 w-auto object-contain drop-shadow-sm"
          />
        ) : (
          <div className="flex h-32 w-48 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="m2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Asset Details Section */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <DetailRow label="Asset ID" value={props.assetTag} bold />
          <DetailRow label="Category" value={props.category} />
          <DetailRow label="Model" value={props.model} />
          <DetailRow label="Brand" value={props.brand} />
          <DetailRow label="Serial Number" value={props.serialNumber} />
          <DetailRow label="Date Created" value={formatDateString(props.dateCreated)} />
        </div>
      </div>

      {/* Disposal Request Details Section (Grey Background) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 space-y-4">
        <div className="space-y-3">
          <DetailRow label="Requested By" value={props.requestedBy} />
          <DetailRow label="Date Requested" value={formatDateString(props.dateRequested)} />
          <DetailRow label="Reason Category" value={props.reason} />
        </div>

        {/* Technician Notes */}
        <div className="border-t border-slate-200 pt-4">
          <p className={`${TYPOGRAPHY_CLASSNAMES.textSmSemiBold} text-slate-900 mb-2`}>
            Technician Notes:
          </p>
          <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-slate-600 leading-relaxed`}>
            {props.justification || 'No additional notes provided.'}
          </p>
        </div>
      </div>

      {/* Financial Information Section */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <DetailRow label="Purchase Date" value={formatDateString(props.purchaseDate)} />
          <DetailRow label="Original Cost" value={props.originalCost ? `$${props.originalCost.toFixed(0)}` : '-'} />
          <DetailRow label="Current Book Value" value={props.currentBookValue ? `$${props.currentBookValue.toFixed(0)}` : '-'} />
          <div className="flex items-start text-sm leading-5">
            <span className="w-40 font-semibold text-slate-900">Warranty Status:</span>
            <WarrantyStatusBadge status={props.warrantyStatus} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SlidePanel
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span className="text-slate-900">Disposal Request Review</span>
        </div>
      }
      content={panelContent}
      actions={panelActions}
    />
  );
}