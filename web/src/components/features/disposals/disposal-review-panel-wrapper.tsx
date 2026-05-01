'use client';

import { useEffect, useState } from 'react';

import { getDisposalReviewDetails, type DisposalReviewDetails } from '@/actions/disposals';
import { DisposalReviewPanel } from './disposal-review-panel';
import { RejectDisposalDialog } from './reject-disposal-dialog';
// 1. Import the new Execute dialog
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
  const [extendedData, setExtendedData] = useState<DisposalReviewDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for both dialogs
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false); // 2. Add Execute state

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

  // 3. Add success handler for execution
  const handleExecuteSuccess = () => {
    setIsExecuteDialogOpen(false);
    onClose(false);
  };

  return (
    <>
      <DisposalReviewPanel
        isOpen={isOpen}
        onClose={onClose}
        isLoading={isLoading}
        assetTag={row?.assetTag ?? ''}
        model={row?.assetName ?? ''}
        serialNumber={extendedData?.assetTag ?? '-'}
        category={extendedData?.category ?? '-'}
        brand={extendedData?.brand ?? '-'}
        dateCreated={extendedData?.requestedAt ?? ''}
        imageUrl={undefined}
        requestedBy={row?.flaggedBy ?? ''}
        dateRequested={row?.requestedAt ? new Date(row.requestedAt).toISOString() : ''}
        reason={row?.reason ?? ''}
        justification={extendedData?.justification ?? ''}
        purchaseDate={extendedData?.purchaseDate ?? ''}
        originalCost={extendedData?.originalCost ?? undefined}
        currentBookValue={undefined}
        warrantyStatus={extendedData?.warrantyStatus === 'Expired' ? 'Expired' : extendedData?.warrantyStatus === 'Valid' ? 'Valid' : ''}
        
        onReject={() => setIsRejectDialogOpen(true)}
        onApprove={() => setIsExecuteDialogOpen(true)} // 4. Wire the approve action to open the dialog
      />

      {row && (
        <>
          <RejectDisposalDialog
            isOpen={isRejectDialogOpen}
            onOpenChange={setIsRejectDialogOpen}
            disposalId={row.id}
            assetId={row.assetId}
            assetName={row.assetName ?? 'Unknown Device'}
            assetTag={row.assetTag}
            onSuccess={handleRejectSuccess}
          />

          {/* 5. Render the Execute Dialog */}
          <ExecuteDisposalDialog
            isOpen={isExecuteDialogOpen}
            onOpenChange={setIsExecuteDialogOpen}
            disposalId={row.id}
            assetId={row.assetId}
            assetName={row.assetName ?? 'Unknown Device'}
            assetTag={row.assetTag}
            onSuccess={handleExecuteSuccess}
          />
        </>
      )}
    </>
  );
}