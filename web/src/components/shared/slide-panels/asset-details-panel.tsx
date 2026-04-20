'use client';

import React, { useMemo } from 'react';
import { TabbedPanel, type TabbedPanelTab } from '@/components/shared/slide-panels/tabbed-panel';
import { type SlidePanelAction } from '@/components/shared/slide-panel';
import { AssetDetailsTab } from '../assets/asset-details-tab';
import { TechnicalDetailsTab } from '../assets/technical-details-tab';
import { PurchaseDetailsTab } from '../assets/purchase-details-tab';
import { HistoryTab, type HistoryEvent } from '../assets/history-tab';

export interface AssetDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Asset Data
  assetId: string;
  assetTag: string;
  assetCategory: 'Hardware' | 'Software' | 'Furniture' | 'Office Electronics';
  model: string;
  brand: string;
  serialNumber?: string;
  owner?: string;
  group?: string;
  warranty?: string;
  lastRepaired?: string;
  dateCreated: string;
  updatedAt: string;
  note?: string;
  status: 'Available' | 'Assigned' | 'In Repair' | 'Defective' | 'Lost' | 'Retired' | 'Disposed';
  imageUrl?: string;
  
  // Technical/Physical Details
  specs?: Record<string, string | number | undefined>;
  techNote?: string;
  
  // Purchase Details
  currency?: string;
  purchaseDate?: string;
  basePrice?: string;
  shippingCost?: string;
  tax?: string;
  totalCost?: string;
  warrantyPeriod?: string;
  totalRepairCost?: string;
  invoicePdf?: string;
  vendorInfo?: {
    vendorId: string;
    vendorName: string;
    contactPerson?: string;
    contactNumber?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  
  // History
  historyEvents?: HistoryEvent[];
  
  // Callbacks
  onEdit?: () => void;
  onActionButtonClick?: () => void;
  onViewAllHistory?: () => void;
  onQRCodeClick?: () => void;
  onCurrencyChange?: (currency: string) => void;
}

export function AssetDetailsPanel({
  isOpen,
  onClose,
  assetId,
  assetTag,
  assetCategory,
  model,
  brand,
  serialNumber,
  owner,
  group,
  warranty,
  lastRepaired,
  dateCreated,
  updatedAt,
  note,
  status,
  imageUrl,
  specs = {},
  techNote,
  currency = 'USD',
  purchaseDate,
  basePrice,
  shippingCost,
  tax,
  totalCost,
  warrantyPeriod,
  totalRepairCost,
  invoicePdf,
  vendorInfo,
  historyEvents = [],
  onEdit,
  onActionButtonClick,
  onViewAllHistory,
  onQRCodeClick,
  onCurrencyChange,
}: AssetDetailsPanelProps) {
  // Determine action button label based on category
  const getActionButtonLabel = () => {
    switch (assetCategory) {
      case 'Furniture':
        return 'Transfer';
      case 'Software':
        return 'Return';
      default:
        return 'Request Return';
    }
  };

  // Build tabs based on asset category
  const tabs: TabbedPanelTab[] = useMemo(() => {
    const tabsList: TabbedPanelTab[] = [
      {
        id: 'asset-details',
        label: 'Asset Details',
        content: (
          <AssetDetailsTab
            assetId={assetId}
            assetTag={assetTag}
            category={assetCategory}
            model={model}
            brand={brand}
            serialNumber={serialNumber}
            owner={owner}
            group={group}
            warranty={warranty}
            lastRepaired={lastRepaired}
            dateCreated={dateCreated}
            updatedAt={updatedAt}
            note={note}
            imageUrl={imageUrl}
            status={status}
            onQRCodeClick={onQRCodeClick}
          />
        ),
      },
    ];

    // Add technical/physical details tab based on category
    if (assetCategory === 'Hardware' || assetCategory === 'Office Electronics') {
      tabsList.push({
        id: 'technical-details',
        label: 'Technical Details',
        content: (
          <TechnicalDetailsTab
            specs={specs}
            note={techNote}
          />
        ),
      });
    } else if (assetCategory === 'Furniture') {
      tabsList.push({
        id: 'physical-details',
        label: 'Physical Details',
        content: (
          <TechnicalDetailsTab
            specs={specs}
            note={techNote}
          />
        ),
      });
    }

    // Add purchase details tab
    if (vendorInfo) {
      tabsList.push({
        id: 'purchase-details',
        label: 'Purchase Details',
        content: (
          <PurchaseDetailsTab
            currency={currency}
            purchaseDate={purchaseDate || '-'}
            basePrice={basePrice || '-'}
            shippingCost={shippingCost || '-'}
            tax={tax || '-'}
            totalCost={totalCost || '-'}
            warrantyPeriod={warrantyPeriod || '-'}
            totalRepairCost={totalRepairCost}
            invoicePdf={invoicePdf}
            vendor={vendorInfo}
            onCurrencyChange={onCurrencyChange}
          />
        ),
      });
    }

    // Add history tab
    if (historyEvents.length > 0) {
      tabsList.push({
        id: 'history',
        label: 'History',
        content: (
          <HistoryTab
            events={historyEvents}
            onViewAll={onViewAllHistory}
          />
        ),
      });
    }

    return tabsList;
  }, [assetId, assetTag, assetCategory, model, brand, serialNumber, owner, group, warranty, lastRepaired, dateCreated, updatedAt, note, imageUrl, status, specs, techNote, currency, purchaseDate, basePrice, shippingCost, tax, totalCost, warrantyPeriod, totalRepairCost, invoicePdf, vendorInfo, historyEvents, onQRCodeClick, onCurrencyChange, onViewAllHistory]);

  const actions: SlidePanelAction[] = [
    { id: 'edit', label: 'Edit', variant: 'outline', onClick: onEdit },
    { id: 'action', label: getActionButtonLabel(), variant: 'default', onClick: onActionButtonClick },
  ];

  return (
    <TabbedPanel
      isOpen={isOpen}
      onClose={onClose}
      title={`${model} - ${assetTag}`}
      tabs={tabs}
      defaultTabId="asset-details"
      actions={actions}
    />
  );
}