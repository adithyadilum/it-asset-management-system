'use client';

import React, { useEffect, useMemo } from 'react';
import { TabbedPanel, type TabbedPanelTab } from './tabbed-panel';
import { type SlidePanelAction } from '@/components/shared/slide-panel';
import { AssetDetailsTab } from '@/components/shared/assets/asset-details-tab';
import { TechnicalDetailsTab } from '@/components/shared/assets/technical-details-tab';
import { PurchaseDetailsTab } from '@/components/shared/assets/purchase-details-tab';
import { HistoryTab, type HistoryEvent } from '@/components/shared/assets/history-tab';
import { AssetLoadingSkeleton } from '@/components/shared/assets/asset-loading-skeleton';
import { useSidebar } from '@/lib/context/sidebar-context';

export type AssetTabType = 'Asset Details' | 'Technical Details' | 'Physical Details' | 'Purchase Details' | 'History';

export interface AssetDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  
  // Asset Data
  assetId: string;
  assetTag: string;
  assetCategory: 'IT & Digital' | 'Software' | 'Office Furniture' | 'Office Electronics';
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
  invoiceUrl?: string;
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
  isLoading = false,
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
  invoiceUrl,
  vendorInfo,
  historyEvents = [],
  onEdit,
  onActionButtonClick,
  onViewAllHistory,
  onQRCodeClick,
  onCurrencyChange,
}: AssetDetailsPanelProps) {
  const { collapseSidebar, expandSidebar } = useSidebar();

  // Collapse sidebar when panel opens
  useEffect(() => {
    if (isOpen) {
      collapseSidebar();
    } else {
      expandSidebar();
    }
  }, [isOpen, collapseSidebar, expandSidebar]);

  // Determine action button label based on category
  const getActionButtonLabel = () => {
    switch (assetCategory) {
      case 'Office Furniture':
        return 'Transfer';
      case 'Software':
        return 'Return';
      default:
        return 'Request Return';
    }
  };

  // Build tabs based on asset category
  const tabs: TabbedPanelTab[] = useMemo(() => {
    const tabsList: TabbedPanelTab[] = [];

    // Always add Asset Details tab
    tabsList.push({
      id: 'asset-details',
      label: 'Asset Details',
      content: isLoading ? (
        <AssetLoadingSkeleton />
      ) : (
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
    });

    // Add Technical/Physical Details tab based on category
    if (assetCategory === 'IT & Digital' || assetCategory === 'Office Electronics') {
      tabsList.push({
        id: 'technical-details',
        label: 'Technical Details',
        content: isLoading ? (
          <AssetLoadingSkeleton />
        ) : (
          <TechnicalDetailsTab specs={specs} note={techNote} />
        ),
      });
    } else if (assetCategory === 'Office Furniture') {
      tabsList.push({
        id: 'physical-details',
        label: 'Physical Details',
        content: isLoading ? (
          <AssetLoadingSkeleton />
        ) : (
          <TechnicalDetailsTab specs={specs} note={techNote} />
        ),
      });
    }

    // Add Purchase Details tab (all categories except Software sometimes)
    if (vendorInfo || purchaseDate) {
      tabsList.push({
        id: 'purchase-details',
        label: 'Purchase Details',
        content: isLoading ? (
          <AssetLoadingSkeleton />
        ) : (
          <PurchaseDetailsTab
            currency={currency}
            purchaseDate={purchaseDate || '-'}
            basePrice={basePrice || '-'}
            shippingCost={shippingCost || '-'}
            tax={tax || '-'}
            totalCost={totalCost || '-'}
            warrantyPeriod={warrantyPeriod || '-'}
            totalRepairCost={totalRepairCost}
            invoicePdf={invoiceUrl}
            vendor={vendorInfo || {
              vendorId: '',
              vendorName: 'N/A',
            }}
            onCurrencyChange={onCurrencyChange}
          />
        ),
      });
    }

    // Add History tab (not for Software)
    if (assetCategory !== 'Software' && historyEvents.length > 0) {
      tabsList.push({
        id: 'history',
        label: 'History',
        content: isLoading ? (
          <AssetLoadingSkeleton />
        ) : (
          <HistoryTab events={historyEvents} onViewAll={onViewAllHistory} />
        ),
      });
    }

    return tabsList;
  }, [
    isLoading,
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
    imageUrl,
    status,
    specs,
    techNote,
    currency,
    purchaseDate,
    basePrice,
    shippingCost,
    tax,
    totalCost,
    warrantyPeriod,
    totalRepairCost,
    invoiceUrl,
    vendorInfo,
    historyEvents,
    onQRCodeClick,
    onCurrencyChange,
    onViewAllHistory,
  ]);

  const actions: SlidePanelAction[] = [
    { id: 'edit', label: 'Edit', variant: 'outline', onClick: onEdit },
    {
      id: 'action',
      label: getActionButtonLabel(),
      variant: 'default',
      onClick: onActionButtonClick,
    },
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