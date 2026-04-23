'use client';

import React from 'react';
import { format } from 'date-fns';
import { AlertCircle, Image as ImageIcon } from 'lucide-react';

import { SlidePanel, type SlidePanelAction } from '@/components/shared/slide-panel';
import { AssetLoadingSkeleton } from '@/components/features/asset-registry/panels/asset-loading-skeleton';

export interface DisposalReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
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

// Inline label component to match Figma spacing
function InlineDetailItem({ label, value, valueClassName = 'text-slate-500' }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="flex items-start text-[13px] leading-6">
      <span className="w-32 font-semibold text-slate-800">{label}:</span>
      <span className={valueClassName}>{value || '-'}</span>
    </div>
  );
}

export function DisposalReviewPanel(props: DisposalReviewPanelProps) {
  
  const formatDateString = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try { return format(new Date(dateString), 'MM/dd/yyyy'); } catch { return '-'; }
  };

  const titleNode = (
    <span className="flex items-center gap-2 text-amber-500">
      <AlertCircle className="size-5" strokeWidth={2.5} />
      Disposal Request Review
    </span>
  );

  const actions: SlidePanelAction[] = [
    { id: 'reject', label: 'Reject', variant: 'outline', onClick: props.onReject },
    { id: 'approve', label: 'Initiate Disposal', variant: 'destructive', onClick: props.onApprove },
  ];

  const content = props.isLoading || !props.assetTag ? (
    <div className="mt-4">
      <AssetLoadingSkeleton />
    </div>
  ) : (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Image and Core Details */}
      <section>
        <div className="mb-8 flex justify-center">
          {props.imageUrl ? (
            <img src={props.imageUrl} alt={props.model} className="h-32 w-auto object-contain drop-shadow-sm" />
          ) : (
            <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-slate-50 border border-slate-200">
              <ImageIcon className="size-8 text-slate-300" />
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
          <div className="space-y-3">
            <InlineDetailItem label="Asset ID" value={props.assetTag} valueClassName="text-slate-800 font-medium" />
            <InlineDetailItem label="Model" value={props.model} />
            <InlineDetailItem label="Serial Number" value={props.serialNumber} />
          </div>
          <div className="space-y-3">
            <InlineDetailItem label="Category" value={props.category} />
            <InlineDetailItem label="Brand" value={props.brand} />
            <InlineDetailItem label="Date Created" value={formatDateString(props.dateCreated)} />
          </div>
        </div>
      </section>

      {/* 2. Context Gray Box */}
      <section className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 shadow-sm">
        <div className="space-y-3 mb-5">
          <InlineDetailItem label="Requested By" value={props.requestedBy} />
          <InlineDetailItem label="Date Requested" value={formatDateString(props.dateRequested)} />
          <InlineDetailItem label="Reason Category" value={props.reason} />
        </div>
        
        <div className="flex flex-col gap-1 pt-2">
          <span className="text-[13px] font-semibold text-slate-800">Technician Notes:</span>
          <p className="text-[13px] leading-relaxed text-slate-500">
            {props.justification || 'No additional notes provided.'}
          </p>
        </div>
      </section>

      {/* 3. Financial Info */}
      <section>
        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
          <div className="space-y-3">
            <InlineDetailItem label="Purchase Date" value={formatDateString(props.purchaseDate)} />
            <InlineDetailItem label="Current Book Value" value={props.currentBookValue ? `$${props.currentBookValue.toFixed(0)}` : '-'} />
          </div>
          <div className="space-y-3">
            <InlineDetailItem label="Original Cost" value={props.originalCost ? `$${props.originalCost.toFixed(0)}` : '-'} />
            <InlineDetailItem 
              label="Warranty Status" 
              value={
                props.warrantyStatus === 'Expired' ? (
                  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">Expired</span>
                ) : (
                  <span className="text-emerald-600 font-medium">{props.warrantyStatus}</span>
                )
              }
            />
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <SlidePanel
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={titleNode}
      content={content}
      actions={actions}
    />
  );
}