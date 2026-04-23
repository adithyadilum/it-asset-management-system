'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { AlertCircle, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssetLoadingSkeleton } from '@/components/features/asset-registry/panels/asset-loading-skeleton';

export interface DisposalReviewPanelProps {
  isOpen: boolean;
  onCloseUrl: string;
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

function InlineDetailItem({
  label,
  value,
  valueClassName = 'text-slate-500',
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start text-[13px] leading-6">
      <span className="w-32 font-semibold text-slate-800">{label}:</span>
      <span className={valueClassName}>{value || '-'}</span>
    </div>
  );
}

export function DisposalReviewPanel(props: DisposalReviewPanelProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push(props.onCloseUrl, { scroll: false });
  };

  const formatDateString = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MM/dd/yyyy');
    } catch {
      return '-';
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2 text-amber-500">
          <AlertCircle className="h-5 w-5" strokeWidth={2.5} />
          <h2 className="text-lg font-semibold text-amber-500">Disposal Request Review</h2>
        </div>
        <button 
          onClick={handleClose} 
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {props.isLoading || !props.assetTag ? (
          <AssetLoadingSkeleton />
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section>
              <div className="mb-8 flex justify-center">
                {props.imageUrl ? (
                  <img
                    src={props.imageUrl}
                    alt={props.model}
                    className="h-32 w-auto object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="flex h-32 w-48 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="space-y-3">
                  <InlineDetailItem label="Asset ID" value={props.assetTag} valueClassName="font-medium text-slate-800" />
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

            <section className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 shadow-sm">
              <div className="mb-5 space-y-3">
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

            <section>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
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
                      ) : props.warrantyStatus ? (
                        <span className="font-medium text-emerald-600">{props.warrantyStatus}</span>
                      ) : (
                        '-'
                      )
                    }
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      
      <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
        <Button variant="outline" onClick={props.onReject}>
          Reject
        </Button>
        <Button variant="destructive" onClick={props.onApprove}>
          Initiate Disposal
        </Button>
      </div>
    </div>
  );
}