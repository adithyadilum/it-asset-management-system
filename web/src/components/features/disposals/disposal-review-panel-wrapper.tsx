'use client';

import { useEffect, useState } from 'react';

import { getDisposalReviewDetails } from '@/actions/disposals';
import type { DisposalReviewDetails } from '@/types/disposals';
import { DisposalReviewPanel } from './disposal-review-panel';
import { RejectDisposalDialog } from './reject-disposal-dialog';
import { ExecuteDisposalDialog } from './execute-disposal-dialog';
import type { PendingDisposalRow } from './pending-disposals-grid';

export interface DisposalReviewPanelWrapperProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  row: PendingDisposalRow | null;
}

export function DisposalReviewPanelWrapper({
  isOpen,
  onClose,
  row,
}: DisposalReviewPanelWrapperProps) {
  const [extendedData, setExtendedData] =
    useState<DisposalReviewDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // State for both dialogs
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isOpen || !row) {
        setExtendedData(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const data = await getDisposalReviewDetails(row.id);
        if (cancelled) return;
        setExtendedData(data);
      } catch {
        if (cancelled) return;
        setExtendedData(null);
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [isOpen, row]);

  const handleRejectSuccess = () => {
    setIsRejectDialogOpen(false);
    onClose(false);
  };

  const handleExecuteSuccess = () => {
    setIsExecuteDialogOpen(false);
    onClose(false);
  };

  return (
    <>
      <DisposalReviewPanel
        key={row ? row.id : 'empty-panel'}
        isOpen={isOpen}
        onClose={onClose}
        isLoading={isLoading}
        assetTag={row?.assetTag ?? ''}
        model={row?.assetName ?? ''}
        serialNumber={extendedData?.assetTag ?? '-'}
        category={extendedData?.category ?? '-'}
        brand={extendedData?.brand ?? '-'}
        imageUrl={undefined}
        requestedBy={row?.flaggedBy ?? ''}
        dateRequested={
          row?.requestedAt ? new Date(row.requestedAt).toISOString() : ''
        }
        reason={row?.reason ?? ''}
        justification={extendedData?.justification ?? ''}
        purchaseDate={extendedData?.purchaseDate ?? ''}
        originalCost={extendedData?.originalCost ?? undefined}
        currentBookValue={undefined}
        warrantyStatus={
          extendedData?.warrantyStatus === 'Expired'
            ? 'Expired'
            : extendedData?.warrantyStatus === 'Valid'
              ? 'Valid'
              : ''
        }
        dateCreated={extendedData?.dateCreated ?? ''}
        onReject={() => setIsRejectDialogOpen(true)}
        onApprove={() => setIsExecuteDialogOpen(true)}
      />

      {row && (
        <>
          {/* Unified Reject Dialog - Passed as an array of 1 */}
          <RejectDisposalDialog
            isOpen={isRejectDialogOpen}
            onOpenChange={setIsRejectDialogOpen}
            selectedAssets={[row]}
            onSuccess={handleRejectSuccess}
          />

          {/* Unified Execute Dialog - Passed as an array of 1 */}
          <ExecuteDisposalDialog
            isOpen={isExecuteDialogOpen}
            onOpenChange={setIsExecuteDialogOpen}
            selectedAssets={[row]}
            singleCategory={extendedData?.category ?? ''}
            onSuccess={handleExecuteSuccess}
          />
        </>
      )}
    </>
  );
}
