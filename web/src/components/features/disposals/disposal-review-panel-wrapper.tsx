'use client';

import { useEffect, useState } from 'react';
import { DisposalReviewPanel } from './disposal-review-panel';
import type { PendingDisposalRow } from './pending-disposals-grid';

export interface DisposalReviewPanelWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  row: PendingDisposalRow | null;
}

export function DisposalReviewPanelWrapper({ isOpen, onClose, row }: DisposalReviewPanelWrapperProps) {
  const [extendedData, setExtendedData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && row) {
      setIsLoading(true);
      
      // Simulate an API call to get financial/warranty data for the specific row
      const timer = setTimeout(() => {
        setExtendedData({
          brand: 'Standard Brand',
          serialNumber: `SN-${row.assetTag}-X9`,
          category: 'IT Equipment',
          dateCreated: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          imageUrl: null,
          justification: `Hardware evaluation complete. ${row.reason} confirmed.`,
          purchaseDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          currentBookValue: 120.00,
          originalCost: 1250.00,
          warrantyStatus: 'Expired'
        });
        setIsLoading(false);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isOpen, row]);

  return (
    <DisposalReviewPanel
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isLoading}
      // Pass the REAL data from the clicked row
      assetTag={row?.assetTag ?? ''}
      model={row?.assetName ?? ''}
      requestedBy={row?.flaggedBy ?? ''}
      dateRequested={row?.requestedAt ? new Date(row.requestedAt).toISOString() : ''}
      reason={row?.reason ?? ''}
      // Pass the simulated extended data
      serialNumber={extendedData?.serialNumber ?? ''}
      category={extendedData?.category ?? ''}
      brand={extendedData?.brand ?? ''}
      dateCreated={extendedData?.dateCreated ?? ''}
      imageUrl={extendedData?.imageUrl}
      justification={extendedData?.justification ?? ''}
      purchaseDate={extendedData?.purchaseDate ?? ''}
      currentBookValue={extendedData?.currentBookValue}
      originalCost={extendedData?.originalCost}
      warrantyStatus={extendedData?.warrantyStatus ?? ''}
      onReject={() => console.log('Reject')}
      onApprove={() => console.log('Approve')}
    />
  );
}