'use client';

import { useState } from 'react';
import {
  CurrencyFormatted,
  DateFormatted,
} from '@/components/shared/formatters';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  SlidePanel,
  type SlidePanelAction,
} from '@/components/shared/slide-panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { cn } from '@/lib/utils';
import { ResolveInternallyDialog } from './resolve-internally-dialog';
import { InitiateRepairDialog } from './initiate-repair-dialog';
import type {
  IssueReviewPanelData,
  Vendor,
  InitiateRepairFormData,
} from '@/types/maintenance';

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
    return <CurrencyFormatted amount={value} compact />;
  };

  const formatDate = (dateString: string | null) => {
    return <DateFormatted date={dateString} />;
  };

  if (isLoading || !data) {
    const skeletonContent = (
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
      </div>
    );

    return (
      <SlidePanel
        isOpen={isOpen}
        onClose={() => onClose(false)}
        title="Issue Review"
        content={skeletonContent}
        actions={[]}
      />
    );
  }

  const { ticket, warrantyStatus, bookValue, originalCost } = data;

  const resolvedPanelTitle = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate">
        {ticket.asset.name || ticket.model?.name || 'Asset'}
      </span>
      <StatusBadge
        variant="metadata"
        label={`ID: ${ticket.asset.assetTag || '-'}`}
      />
      <StatusBadge value={ticket.asset.status} showIcon />
    </div>
  );

  const detailsFields = [
    { label: 'Asset ID', value: ticket.asset.assetTag },
    { label: 'Category', value: ticket.category?.name || 'N/A' },
    { label: 'Model', value: ticket.model?.name || 'N/A' },
    { label: 'Brand', value: ticket.brand?.name || 'N/A' },
    { label: 'Serial Number', value: ticket.asset.serialNumber || 'N/A' },
    { label: 'Date Created', value: formatDate(ticket.asset.createdAt) },
  ];

  const financialFields = [
    {
      label: 'Purchase Date',
      value: formatDate(ticket.purchase?.purchaseDate || null),
    },
    { label: 'Original Cost', value: formatCurrency(originalCost) },
    { label: 'Current Book Value', value: formatCurrency(bookValue) },
    {
      // "Active" alone does not answer the reviewer's question, which is how
      // long is left before this repair stops being covered.
      label: 'Warranty',
      value: (
        <div className="flex items-center gap-2">
          <StatusBadge
            value={warrantyStatus === 'Active' ? 'active' : 'expired'}
            label={warrantyStatus}
          />
          {ticket.purchase?.warrantyExpiry ? (
            <span className="text-xs text-muted-foreground">
              {warrantyStatus === 'Active' ? 'expires' : 'expired'}{' '}
              {formatDate(ticket.purchase.warrantyExpiry)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              no warranty recorded
            </span>
          )}
        </div>
      ),
    },
  ];
  if (data.totalTCO != null) {
    financialFields.push({
      label: 'Total TCO',
      value: (
        <span className="font-semibold text-primary">
          {formatCurrency(data.totalTCO)}
        </span>
      ),
    });
  }

  const mainContent = (
    <div className="flex w-full flex-col items-start gap-6">
      {/* Image Container */}
      <div className="mt-2 flex w-full flex-col items-center gap-2.5">
        {ticket.model?.imageUrl ? (
          <div className="relative w-38.25 h-30.25 rounded bg-background overflow-hidden border border-border">
            <Image
              src={ticket.model.imageUrl}
              alt="Asset Image"
              fill
              className="object-contain p-2"
            />
          </div>
        ) : (
          <div className="flex h-30.25 w-38.25 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-center text-xs text-muted-foreground">
            No image available
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="mt-4 grid w-full grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
        {detailsFields.map((item, index) => (
          <div
            key={`detail-${index}`}
            className="flex items-center justify-between border-b border-border/40 py-2.5"
          >
            <div
              className={cn(
                TYPOGRAPHY_CLASSNAMES.textSmMedium,
                'shrink-0 pr-4 text-muted-foreground'
              )}
            >
              {item.label}
            </div>
            <div
              className={cn(
                TYPOGRAPHY_CLASSNAMES.textSmMedium,
                'text-right text-foreground',
                item.label === 'Asset ID' && 'font-mono tracking-wide'
              )}
            >
              {item.value || '-'}
            </div>
          </div>
        ))}
      </div>

      <div className="my-2 h-px w-full bg-border" />

      {/* Financials Grid */}
      <div className="grid w-full grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
        <h3 className="col-span-full text-base font-medium leading-6 text-foreground mb-2">
          Financial Vitals
        </h3>
        {financialFields.map((item, index) => (
          <div
            key={`financial-${index}`}
            className="flex items-center justify-between border-b border-border/40 py-2.5"
          >
            <div
              className={cn(
                TYPOGRAPHY_CLASSNAMES.textSmMedium,
                'shrink-0 pr-4 text-muted-foreground'
              )}
            >
              {item.label}
            </div>
            <div
              className={cn(
                TYPOGRAPHY_CLASSNAMES.textSmMedium,
                'text-right text-foreground'
              )}
            >
              {item.value || '-'}
            </div>
          </div>
        ))}
      </div>

      <div className="my-2 h-px w-full bg-border" />

      {/* Reported Issue Section */}
      <div className="w-full mt-2">
        <div className="space-y-2">
          <div
            className={cn(
              TYPOGRAPHY_CLASSNAMES.textSmMedium,
              'text-muted-foreground'
            )}
          >
            Reported Issue (Dispatched By:{' '}
            <span className="font-semibold text-foreground">
              {ticket.reportedBy?.name || 'Unknown'}
            </span>
            )
          </div>
          <Textarea
            readOnly
            value={ticket.reportedIssue}
            className="min-h-25 w-full resize-none bg-muted/30 text-foreground focus-visible:ring-0"
          />
        </div>
      </div>
    </div>
  );

  const slidePanelActions: SlidePanelAction[] = [
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

  return (
    <>
      <SlidePanel
        isOpen={isOpen}
        onClose={() => onClose(false)}
        title={resolvedPanelTitle}
        content={mainContent}
        actions={slidePanelActions}
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
            assetName={
              data.ticket.model?.name || data.ticket.asset.name || undefined
            }
            assetSerial={data.ticket.asset.serialNumber || undefined}
            reportedBy={data.ticket.reportedBy?.name || undefined}
            reportedDate={data.ticket.createdAt}
          />
        </>
      )}
    </>
  );
}
