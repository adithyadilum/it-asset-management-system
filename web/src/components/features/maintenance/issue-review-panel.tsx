// web/src/components/features/maintenance/issue-review-panel.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SlidePanel, type SlidePanelAction } from '@/components/shared/slide-panel';
import type { IssueReviewPanelData } from '@/types/maintenance';
import { AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface IssueReviewPanelProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  data: IssueReviewPanelData | null;
  onResolveInternally?: () => void;
  onInitiateRepair?: () => void;
}

export function IssueReviewPanel({
  isOpen,
  onClose,
  data,
  onResolveInternally,
  onInitiateRepair,
}: IssueReviewPanelProps) {
  if (!data) {
    return null;
  }

  const { ticket, warrantyStatus, bookValue, originalCost } = data;

  // Format currency
  const formatCurrency = (value: number | string | null) => {
    if (value === null) return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  // Panel actions (styled to match Figma)
  const panelActions: SlidePanelAction[] = [
    {
      id: 'resolve-internally',
      label: 'Resolve Internally',
      variant: 'outline',
      onClick: onResolveInternally,
    },
    {
      id: 'initiate-repair',
      label: 'Initiate Repair',
      variant: 'default',
      // Adding custom background color to match the UI design's navy button
      className: 'bg-[#040d5a] hover:bg-[#040d5a]/90 text-white',
      onClick: onInitiateRepair,
    },
  ];

  // Panel content - Adjusted to match Figma grid layouts
  const panelContent = (
    <div className="space-y-8">
      {/* Asset Image */}
      <div className="flex justify-center mt-4">
        {ticket.asset.imageUrl ? (
          <div className="relative h-28 w-40 rounded-lg bg-white border border-slate-200 overflow-hidden">
            <Image
              src={ticket.asset.imageUrl}
              alt={ticket.asset.name || ticket.asset.assetTag}
              fill
              className="object-contain p-2"
            />
          </div>
        ) : (
          <div className="h-28 w-40 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
            <span className="text-xs text-slate-400">No Image</span>
          </div>
        )}
      </div>

      {/* Asset Details Grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
          <span className="font-medium text-slate-900">Asset ID :</span>
          <span className="font-light text-slate-700">{ticket.asset.assetTag}</span>

          <span className="font-medium text-slate-900">Model :</span>
          <span className="font-light text-slate-700">{ticket.model?.name || 'N/A'}</span>

          <span className="font-medium text-slate-900">Serial Number :</span>
          <span className="font-light text-slate-700">{ticket.asset.serialNumber || 'N/A'}</span>
        </div>
        
        <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
          <span className="font-medium text-slate-900">Category :</span>
          <span className="font-light text-slate-700">{ticket.category?.name || 'N/A'}</span>

          <span className="font-medium text-slate-900">Brand :</span>
          <span className="font-light text-slate-700">{ticket.brand?.name || 'N/A'}</span>

          <span className="font-medium text-slate-900">Date Created :</span>
          <span className="font-light text-slate-700">{formatDate(ticket.asset.createdAt)}</span>
        </div>
      </div>

      {/* Reported By and Issue Section */}
      <div className="rounded-xl bg-slate-50 border border-slate-100 p-5 space-y-4 text-sm">
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <span className="font-medium text-slate-900">Reported By:</span>
          <span className="font-light text-slate-700">{ticket.reportedBy?.name || 'Unknown'}</span>
        </div>
        <div className="space-y-1">
          <span className="font-medium text-slate-900 block">Issue:</span>
          <span className="font-light text-slate-500 block pt-1">{ticket.reportedIssue}</span>
        </div>
      </div>

      {/* Financial and Warranty Details */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
          <span className="font-medium text-slate-900">Purchase Date:</span>
          <span className="font-light text-slate-700">
            {formatDate(ticket.purchase?.purchaseDate || null)}
          </span>

          <span className="font-medium text-slate-900">Current Book Value:</span>
          <span className="font-light text-slate-700">{formatCurrency(bookValue)}</span>
        </div>

        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
          <span className="font-medium text-slate-900">Original Cost:</span>
          <span className="font-light text-slate-700">{formatCurrency(originalCost)}</span>

          <span className="font-medium text-slate-900">Warranty Status:</span>
          <div>
            <Badge
              variant="outline"
              className={
                warrantyStatus === 'Active'
                  ? 'bg-white text-green-600 border-green-500 rounded-full px-3 py-0.5 font-normal'
                  : 'bg-white text-red-500 border-red-500 rounded-full px-3 py-0.5 font-normal'
              }
            >
              {warrantyStatus}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Issue Review : ${ticket.asset.assetTag}`}
      description="" // Cleared out to match the clean header in the design
      content={panelContent}
      actions={panelActions}
      showCloseButton={true}
    />
  );
}