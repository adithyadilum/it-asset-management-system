'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ResolveInternallyDialog } from './resolve-internally-dialog';
import { InitiateRepairDialog } from './initiate-repair-dialog';
import type { IssueReviewPanelData, Vendor, InitiateRepairFormData } from '@/types/maintenance';
import Image from 'next/image';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { SlidePanel, type SlidePanelAction } from '@/components/shared/slide-panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';

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

  // Title rendering matching Asset Details Panel style
  const resolvedPanelTitle = useMemo(() => {
    if (isLoading || !data) {
      return (
        <div className="flex items-center gap-2">
          <span className="truncate">Issue Review</span>
        </div>
      );
    }
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate">Issue Review</span>
        <StatusBadge
          variant="metadata"
          label={`ID: ${data.ticket.asset.assetTag || '-'}`}
        />
      </div>
    );
  }, [isLoading, data]);

  // Actions matching Asset Details Panel style
  const actions: SlidePanelAction[] = useMemo(() => {
    if (isLoading || !data) return [];
    return [
      {
        id: 'resolve-internally',
        label: 'Resolve Internally',
        variant: 'outline',
        onClick: () => setShowResolveDialog(true),
        disabled: isResolvingInternally || isInitiatingRepair,
      },
      {
        id: 'initiate-repair',
        label: 'Initiate Repair',
        variant: 'default',
        onClick: () => setShowRepairDialog(true),
        disabled: isResolvingInternally || isInitiatingRepair,
      },
    ];
  }, [isLoading, data, isResolvingInternally, isInitiatingRepair]);

  // Content for panel (including loading skeletons or actual data)
  const panelContent = useMemo(() => {
    if (isLoading || !data) {
      return (
        <div className="flex flex-col flex-1 space-y-8 overflow-hidden">
          <div className="flex justify-center shrink-0">
            <Skeleton className="w-45 h-30 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 shrink-0">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <Skeleton className="h-28 w-full rounded-xl shrink-0" />
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 shrink-0">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      );
    }

    const { ticket, warrantyStatus, bookValue, originalCost } = data;

    return (
      <div className="flex flex-col gap-6 text-sm text-foreground">
        {/* Asset Image Header */}
        <div className="flex justify-center shrink-0">
          {ticket.asset.imageUrl ? (
            <div className="relative w-45 h-30 rounded-lg bg-background overflow-hidden border border-border">
              <Image
                src={ticket.asset.imageUrl}
                alt={ticket.asset.name || ticket.asset.assetTag}
                fill
                className="object-contain p-2"
              />
            </div>
          ) : (
            <div className="relative w-45 h-30 bg-muted/30 rounded-lg flex items-center justify-center border border-dashed border-border">
              <span className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-muted-foreground`}>No Image</span>
            </div>
          )}
        </div>

        {/* Asset Details Table */}
        <div className="grid grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
          {[
            { label: 'Asset ID', value: ticket.asset.assetTag, className: 'font-mono tracking-wide' },
            { label: 'Category', value: ticket.category?.name || 'N/A' },
            { label: 'Model', value: ticket.model?.name || 'N/A' },
            { label: 'Brand', value: ticket.brand?.name || 'N/A' },
            { label: 'Serial Number', value: ticket.asset.serialNumber || 'N/A' },
            { label: 'Date Created', value: formatDate(ticket.asset.createdAt) },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-border/40 py-2.5"
            >
              <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'shrink-0 pr-4 text-muted-foreground')}>
                {item.label}
              </div>
              <div
                className={cn(
                  TYPOGRAPHY_CLASSNAMES.textSmMedium,
                  'text-right text-foreground',
                  item.className
                )}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Reported Issue Section */}
        <section className="rounded-lg border border-border/60 bg-card p-5 shadow-xs">
          <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmSemiBold, 'mb-4 text-sm text-foreground')}>
            Reported Issue
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-muted-foreground')}>Dispatched By</span>
              <span className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-foreground')}>
                {ticket.reportedBy?.name || 'Unknown'}
              </span>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <span className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-muted-foreground')}>Issue</span>
              <p className={cn(TYPOGRAPHY_CLASSNAMES.textSmRegular, 'text-foreground bg-muted/30 border border-border/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed')}>
                {ticket.reportedIssue}
              </p>
            </div>
          </div>
        </section>

        {/* Financials & Warranty Section */}
        <section className="rounded-lg border border-border/60 bg-card p-5 shadow-xs">
          <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmSemiBold, 'mb-4 text-sm text-foreground')}>
            Financials & Warranty
          </h3>
          <div className="grid grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
            {[
              { label: 'Purchase Date', value: formatDate(ticket.purchase?.purchaseDate || null) },
              { label: 'Original Cost', value: formatCurrency(originalCost) },
              { label: 'Current Book Value', value: formatCurrency(bookValue) },
              {
                label: 'Warranty Status',
                value: (
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-full px-2.5 py-0.5 font-medium shadow-none text-xs border',
                      warrantyStatus === 'Active'
                        ? 'bg-success/15 border-success/30 text-success'
                        : 'bg-destructive/15 border-destructive/30 text-destructive'
                    )}
                  >
                    {warrantyStatus}
                  </Badge>
                ),
              },
              ...(data.totalTCO != null
                ? [
                    {
                      label: 'Total TCO',
                      value: <span className="font-semibold text-primary">{formatCurrency(data.totalTCO)}</span>,
                    },
                  ]
                : []),
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-border/40 py-2.5"
              >
                <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'shrink-0 pr-4 text-muted-foreground')}>
                  {item.label}
                </div>
                <div className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-right text-foreground')}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }, [isLoading, data]);

  return (
    <>
      <SlidePanel
        isOpen={isOpen}
        onClose={onClose}
        title={resolvedPanelTitle}
        content={panelContent}
        actions={actions}
      />

      {data && (
        <>
          <ResolveInternallyDialog
            isOpen={showResolveDialog}
            onClose={() => setShowResolveDialog(false)}
            onConfirm={async (note) => {
              if (onResolveInternally) await onResolveInternally(note);
            }}
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
            assetId={data.ticket.asset.assetTag}
            assetName={data.ticket.model?.name || data.ticket.asset.name || undefined}
            assetSerial={data.ticket.asset.serialNumber || undefined}
            reportedBy={data.ticket.reportedBy?.name || undefined}
            reportedDate={data.ticket.createdAt}
          />
        </>
      )}
    </>
  );
}