// web/src/components/features/maintenance/issue-review-panel.tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/shared/slide-panel';
import { ResolveInternallyDialog } from './resolve-internally-dialog';
import { InitiateRepairDialog } from './initiate-repair-dialog';
import type { IssueReviewPanelData, Vendor, InitiateRepairFormData } from '@/types/maintenance';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface IssueReviewPanelProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  isLoading?: boolean;
  data: IssueReviewPanelData | null;
  vendors: Vendor[];
  onResolveInternally?: (resolutionNote: string) => Promise<void>;
  onInitiateRepair?: (data: InitiateRepairFormData) => Promise<void>;
  isResolvingInternally?: boolean;
  isInitiatingRepair?: boolean;
}

export function IssueReviewPanel({
  isOpen,
  onClose,
  isLoading = false,
  data,
  vendors,
  onResolveInternally,
  onInitiateRepair,
  isResolvingInternally = false,
  isInitiatingRepair = false,
}: IssueReviewPanelProps) {
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showRepairDialog, setShowRepairDialog] = useState(false);

  if (!isOpen) return null;

  // 1. Handle Loading State (Returns early, no red squiggly lines!)
  if (isLoading || !data) {
    return (
      <SlidePanel
        isOpen={isOpen}
        onClose={onClose}
        title=""
        showCloseButton={false}
        showHeader={false}
        scrollable={false}
        contentClassName="!p-0 h-full w-full"
        content={
          <div className="flex flex-col items-center justify-center h-full w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
             <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
             <p className="mt-4 text-sm text-slate-500">Loading issue details...</p>
          </div>
        }
      />
    );
  }

  // 2. Destructure data safely after the loading check
  const { ticket, warrantyStatus, bookValue, originalCost } = data;

  const formatCurrency = (value: number | string | null) => {
    if (value === null) return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  // 3. Define the main panel content layout
  const panelContent = (
    <div className="flex flex-col h-full w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
      
      {/* FIXED HEADER SECTION */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-slate-500 opacity-70" strokeWidth={2} />
          <h2 className="text-xl font-semibold text-slate-900">
            Issue Review : {ticket.asset.assetTag}
          </h2>
        </div>
        <button onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* SCROLLABLE BODY SECTION */}
      <div className="flex flex-col flex-1 p-6 overflow-y-auto">
        {/* Asset Image */}
        <div className="flex justify-center mb-6 shrink-0">
          {ticket.asset.imageUrl ? (
            <div className="relative w-[180px] h-[120px] rounded-lg bg-white overflow-hidden border border-slate-200">
              <Image src={ticket.asset.imageUrl} alt={ticket.asset.name || ticket.asset.assetTag} fill className="object-contain p-2" />
            </div>
          ) : (
            <div className="relative w-[180px] h-[120px] bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-200">
               <span className="text-xs text-slate-400">No Image</span>
            </div>
          )}
        </div>

        {/* Asset Details Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-[14px] shrink-0">
          <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
            <span className="font-medium text-slate-900">Asset ID :</span>
            <span className="font-light text-slate-700">{ticket.asset.assetTag}</span>

            <span className="font-medium text-slate-900">Model :</span>
            <span className="font-light text-slate-700">{ticket.model?.name || 'N/A'}</span>

            <span className="font-medium text-slate-900">Serial Number :</span>
            <span className="font-light text-slate-700">{ticket.asset.serialNumber || 'N/A'}</span>
          </div>
          
          <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
            <span className="font-medium text-slate-900">Category :</span>
            <span className="font-light text-slate-700">{ticket.category?.name || 'N/A'}</span>

            <span className="font-medium text-slate-900">Brand :</span>
            <span className="font-light text-slate-700">{ticket.brand?.name || 'N/A'}</span>

            <span className="font-medium text-slate-900">Date Created :</span>
            <span className="font-light text-slate-700">{formatDate(ticket.asset.createdAt)}</span>
          </div>
        </div>

        {/* Reported By and Issue Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 text-[14px] space-y-4 shrink-0">
          <div className="grid grid-cols-[140px_1fr] gap-2">
            <span className="font-medium text-slate-900">Reported By:</span>
            <span className="font-light text-slate-700">{ticket.reportedBy?.name || 'Unknown'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-slate-900">Issue:</span>
            <span className="font-light text-slate-700">{ticket.reportedIssue}</span>
          </div>
        </div>

        {/* Financial and Warranty Details Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-10 text-[14px] shrink-0">
          <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
            <span className="font-medium text-slate-900">Purchase Date:</span>
            <span className="font-light text-slate-700">{formatDate(ticket.purchase?.purchaseDate || null)}</span>

            <span className="font-medium text-slate-900">Current Book Value:</span>
            <span className="font-light text-slate-700">{formatCurrency(bookValue)}</span>
          </div>
          
          <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
            <span className="font-medium text-slate-900">Original Cost:</span>
            <span className="font-light text-slate-700">{formatCurrency(originalCost)}</span>

            <span className="font-medium text-slate-900">Warranty Status:</span>
            <div>
              <Badge variant="outline" className={warrantyStatus === 'Active' ? 'bg-white border-green-500 text-green-600 rounded-full px-3 py-0.5 font-normal shadow-sm' : 'bg-white border-red-500 text-red-500 rounded-full px-3 py-0.5 font-normal shadow-sm'}>
                {warrantyStatus}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-auto"></div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 shrink-0">
          <Button variant="outline" onClick={() => setShowResolveDialog(true)} disabled={isResolvingInternally || isInitiatingRepair} className="text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm">
            Resolve Internally
          </Button>
          <Button onClick={() => setShowRepairDialog(true)} disabled={isResolvingInternally || isInitiatingRepair} className="bg-[#040d5a] hover:bg-[#040d5a]/90 text-white shadow-sm">
            Initiate Repair
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SlidePanel 
        isOpen={isOpen} 
        onClose={onClose} 
        title="" 
        content={panelContent} 
        showCloseButton={false} 
        showHeader={false} 
        scrollable={false} 
        contentClassName="!p-0 h-full w-full" 
      />
      <ResolveInternallyDialog 
        isOpen={showResolveDialog} 
        onClose={() => setShowResolveDialog(false)} 
        onConfirm={async (note) => { if (onResolveInternally) await onResolveInternally(note); }} 
        isLoading={isResolvingInternally} 
      />
      <InitiateRepairDialog 
        isOpen={showRepairDialog} 
        onClose={() => setShowRepairDialog(false)} 
        onConfirm={async (formData) => { 
          if (onInitiateRepair) await onInitiateRepair(formData); 
        }} 
        vendors={vendors} 
        isLoading={isInitiatingRepair}
        // 👇 Added "|| undefined" to convert database nulls into undefined for React props
        assetId={ticket.asset.assetTag}
        assetName={ticket.model?.name || ticket.asset.name || undefined}
        assetSerial={ticket.asset.serialNumber || undefined}
        reportedBy={ticket.reportedBy?.name || undefined}
        reportedDate={ticket.createdAt}
      />
    </>
  );
}