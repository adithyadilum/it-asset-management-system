'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getDisposalReviewDetails, type DisposalReviewDetails } from '@/actions/disposals';
import { DisposalReviewPanel } from './disposal-review-panel';
import { RejectDisposalDialog } from './reject-disposal-dialog';
import type { PendingDisposalRow } from './pending-disposals-grid';

export interface DisposalReviewPanelWrapperProps {
  isOpen: boolean;
  onCloseUrl: string; 
  row: PendingDisposalRow | null;
}

export function DisposalReviewPanelWrapper({
  isOpen,
  onCloseUrl,
  row,
}: DisposalReviewPanelWrapperProps) {
  const router = useRouter();
  const [extendedData, setExtendedData] = useState<DisposalReviewDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // New state to control the Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

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
      } catch  {
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

  return (
    <>
      <DisposalReviewPanel
        isOpen={isOpen}
        onCloseUrl={onCloseUrl}
        isLoading={isLoading}
        
        // Known Row Data
        assetTag={row?.assetTag ?? ''}
        model={row?.assetName ?? ''}
        requestedBy={row?.flaggedBy ?? ''}
        dateRequested={row?.requestedAt ? new Date(row.requestedAt).toISOString() : ''}
        reason={row?.reason ?? ''}

        // Fetched Extended Data
        serialNumber={extendedData?.assetTag ?? 'N/A'} 
        // 👇 THESE TWO LINES CHANGED 👇
        category={extendedData?.category ?? '-'} 
        brand={extendedData?.brand ?? '-'} 
        // 👆 ---------------------- 👆
        dateCreated={extendedData?.requestedAt ?? ''} 
        justification={extendedData?.justification ?? ''}
        purchaseDate={extendedData?.purchaseDate ?? ''}
        originalCost={extendedData?.originalCost ?? undefined}
        currentBookValue={undefined}
        warrantyStatus={extendedData?.warrantyStatus === 'Expired' ? 'Expired' : extendedData?.warrantyStatus === 'Valid' ? 'Valid' : ''}

        // Trigger the modal when Reject is clicked
        onReject={() => setIsRejectModalOpen(true)}
        
        onApprove={() => console.log('Initiate disposal clicked')}
      />

      {/* Render the modal overlay */}
      {row && (
        <RejectDisposalDialog
          isOpen={isRejectModalOpen}
          onOpenChange={setIsRejectModalOpen}
          disposalId={row.id}
          assetId={row.assetId}
          assetName={row.assetName ?? 'Unknown Device'}
          assetTag={row.assetTag}
          onSuccess={() => {
            setIsRejectModalOpen(false);
            // Close the side panel and return to the main table after successful rejection
            router.push(onCloseUrl, { scroll: false }); 
          }}
        />
      )}
    </>
  );
}