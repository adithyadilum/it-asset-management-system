'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { SlidePanel, type SlidePanelAction } from '@/components/shared/slide-panel';
import { ResolveInternallyDialog } from './resolve-internally-dialog';
import type { IssueReviewPanelData } from '@/types/maintenance';

interface IssueReviewPanelProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  data: IssueReviewPanelData | null;
  onResolveInternally?: (resolutionNote: string) => Promise<void>;
  onInitiateRepair?: () => Promise<void>;
  isResolvingInternally?: boolean;
}

/**
 * Issue Review Slide Panel
 * Displays maintenance ticket details and action buttons
 * US-15.1 Implementation with US-15.2 Resolve Internally action
 */
export function IssueReviewPanel({
  isOpen,
  onClose,
  data,
  onResolveInternally,
  onInitiateRepair,
  isResolvingInternally = false,
}: IssueReviewPanelProps) {
  const [showResolveDialog, setShowResolveDialog] = useState(false);

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

  // Panel actions
  const panelActions: SlidePanelAction[] = [
    {
      id: 'resolve-internally',
      label: 'Resolve Internally',
      variant: 'outline',
      onClick: () => setShowResolveDialog(true),
      disabled: isResolvingInternally,
    },
    {
      id: 'initiate-repair',
      label: 'Initiate Repair',
      variant: 'default',
      onClick: onInitiateRepair,
      disabled: isResolvingInternally,
    },
  ];

  // Panel content
  const panelContent = (
    <div className="space-y-6">
      {/* Asset Image and Details Grid */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="h-32 w-32 rounded-lg bg-slate-100 flex items-center justify-center">
            {/* Placeholder for asset image */}
            <span className="text-xs text-slate-500">Asset Image</span>
          </div>
        </div>

        {/* Asset Details Grid */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Asset ID</p>
              <p className="text-sm font-semibold text-slate-900">{ticket.asset.assetTag}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Model</p>
              <p className="text-sm font-semibold text-slate-900">{ticket.model?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Serial Number</p>
              <p className="text-sm font-semibold text-slate-900">{ticket.asset.serialNumber || 'N/A'}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Category</p>
              <p className="text-sm font-semibold text-slate-900">{ticket.category?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Brand</p>
              <p className="text-sm font-semibold text-slate-900">{ticket.brand?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Date Created</p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(ticket.asset.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reported By and Issue Section */}
      <div className="rounded-lg bg-slate-50 p-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Reported By</p>
          <p className="text-sm font-semibold text-slate-900">{ticket.reportedBy?.name || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Issue</p>
          <p className="text-sm text-slate-700">{ticket.reportedIssue}</p>
        </div>
      </div>

      {/* Financial and Warranty Details */}
      <div className="space-y-3 py-4">
        <div className="flex justify-between items-center">
          <p className="text-xs font-medium text-slate-500">Purchase Date</p>
          <p className="text-sm font-semibold text-slate-900">
            {formatDate(ticket.purchase?.purchaseDate || null)}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs font-medium text-slate-500">Original Cost</p>
          <p className="text-sm font-semibold text-slate-900">{formatCurrency(originalCost)}</p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs font-medium text-slate-500">Current Book Value</p>
          <p className="text-sm font-semibold text-slate-900">{formatCurrency(bookValue)}</p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs font-medium text-slate-500">Warranty Status</p>
          <Badge
            variant={warrantyStatus === 'Active' ? 'default' : 'destructive'}
            className={
              warrantyStatus === 'Active'
                ? 'bg-green-50 text-green-700 border-green-300'
                : 'bg-red-50 text-red-700 border-red-300'
            }
          >
            {warrantyStatus}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SlidePanel
        isOpen={isOpen}
        onClose={onClose}
        title={`Issue Review : ${ticket.asset.assetTag}`}
        description={`Ticket #${ticket.id}`}
        content={panelContent}
        actions={panelActions}
        showCloseButton={true}
      />

      {/* Resolve Internally Dialog */}
      <ResolveInternallyDialog
        isOpen={showResolveDialog}
        onClose={() => setShowResolveDialog(false)}
        onConfirm={async (resolutionNote) => {
          if (onResolveInternally) {
            await onResolveInternally(resolutionNote);
          }
        }}
        isLoading={isResolvingInternally}
      />
    </>
  );
}