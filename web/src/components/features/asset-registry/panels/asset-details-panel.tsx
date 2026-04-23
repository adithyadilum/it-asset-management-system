'use client';

import React, { useMemo } from 'react';
import { TabbedPanel, type TabbedPanelTab } from '@/components/shared/slide-panels/tabbed-panel';
import { type SlidePanelAction } from '@/components/shared/slide-panel';
import { AssetDetailsTab } from './asset-details-tab';
import { TechnicalDetailsTab } from './technical-details-tab';
import { PurchaseDetailsTab } from './purchase-details-tab';
import { HistoryTab } from './history-tab';
import type { HistoryEvent, MaintenanceEvent } from '@/lib/data/asset-details-repo';
import { AssetLoadingSkeleton } from './asset-loading-skeleton';
import { StatusBadge } from '@/components/shared/status-badge';


export interface AssetDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;

  // Base Asset
  assetId: string;
  assetTag: string;
  assetName?: string;
  assetCategory: 'IT & Digital' | 'Software' | 'Office Furniture' | 'Office Electronics' | string;
  model: string;
  brand: string;
  serialNumber?: string;
  owner?: string;
  assignedTo?: string;
  group?: string;
  location?: string;
  condition?: string;
  warranty?: string;
  lastRepaired?: string;
  dateCreated: string;
  updatedAt: string;
  note?: string;
  status: string;
  imageUrl?: string;

  specs?: Record<string, string | number | undefined>;
  techNote?: string;

  // Purchase
  currency?: string;
  purchaseDate?: string;
  basePrice?: string;
  shippingCost?: string;
  tax?: string;
  totalCost?: string;
  warrantyPeriod?: string;
  totalRepairCost?: string;
  invoiceUrl?: string;
  vendorInfo?: { vendorId: string; vendorName: string; contactPerson?: string; contactNumber?: string; email?: string; website?: string; address?: string; };

  // Event Data
  historyEvents?: HistoryEvent[];
  maintenanceEvents?: MaintenanceEvent[];

  // Actions
  onEdit?: () => void;
  onActionButtonClick?: () => void;
  onViewAllHistory?: () => void;
  onViewAllMaintenance?: () => void;
  onQRCodeClick?: () => void;
  onCurrencyChange?: (currency: string) => void;
}

export function AssetDetailsPanel(props: AssetDetailsPanelProps) {
  const getActionButtonLabel = () => {
    if (props.assetCategory === 'Office Furniture') return 'Transfer';
    if (props.assetCategory === 'Software') return 'Return';
    return 'Request Return';
  };

  const tabs: TabbedPanelTab[] = useMemo(() => {
    const tabsList: TabbedPanelTab[] = [];
    const isSoftware = props.assetCategory === 'Software';
    const isFurniture = props.assetCategory === 'Office Furniture';
    const softwareLicenseKey = props.serialNumber || props.specs?.license_key?.toString() || '-';
    const softwareLicenseType = props.specs?.license_type?.toString() || 'Subscription';
    const softwareVersion = props.specs?.version?.toString() || '-';
    const softwareExpirationDate = props.specs?.expiry_date?.toString() || props.specs?.expiration_date?.toString() || '-';
    const softwareTotalSeats = props.specs?.max_seats?.toString() || props.specs?.total_seats?.toString() || '-';
    const softwareAvailableSeats = props.specs?.available_seats?.toString() || '-';

    // 1. Compute Dynamic Grid Fields based on Category
    const detailsFields = [];
    detailsFields.push({ label: 'Asset ID', value: props.assetTag });
    if (isFurniture) {
      detailsFields.push(
        { label: 'Category', value: props.assetCategory },
        { label: 'Product Line', value: props.model },
        { label: 'Manufacturer', value: props.brand },
        { label: 'Location', value: props.location || '-' },
        { label: 'Condition', value: props.condition || '-' }
      );
    } else if (isSoftware) {
      detailsFields.push(
        { label: 'Product', value: props.model || props.assetName || '-' },
        { label: 'License Key', value: props.serialNumber || props.specs?.license_key?.toString() || '-' },
        { label: 'License Type', value: props.specs?.license_type?.toString() || 'Subscription' },
        { label: 'Version', value: props.specs?.version?.toString() || '-' },
        { label: 'Total Seats', value: props.specs?.max_seats?.toString() || props.specs?.total_seats?.toString() || '-' },
        { label: 'Expiration Date', value: props.specs?.expiry_date?.toString() || props.specs?.expiration_date?.toString() || '-' },
        { label: 'Publisher', value: props.brand },
        { label: 'Assigned to', value: props.assignedTo || '-' },
        { label: 'Group', value: props.group || '-' }
      );
    } else {
      detailsFields.push(
        { label: 'Category', value: props.assetCategory },
        { label: 'Model', value: props.model },
        { label: 'Brand', value: props.brand },
        { label: 'Serial Number', value: props.serialNumber || '-' },
        { label: 'Owner', value: props.owner || '-' },
        { label: 'Assigned to', value: props.assignedTo || '-' },
        { label: 'Group', value: props.group || '-' }
      );
    }

    // Common Footer fields
    detailsFields.push(
      { label: 'Date Created', value: props.dateCreated },
      { label: 'Warranty', value: props.warranty || '-' },
      { label: 'Updated at', value: props.updatedAt },
      { label: 'Last Repaired', value: props.lastRepaired || '-' }
    );

    tabsList.push({
      id: 'asset-details',
      label: 'Asset Details',
      content: props.isLoading ? (
        <AssetLoadingSkeleton />
      ) : (
        <AssetDetailsTab
          imageUrl={props.imageUrl}
          note={props.note}
          assetTag={props.assetTag}
          fields={detailsFields}
          mode={isSoftware ? 'software' : 'default'}
          softwareSections={isSoftware ? [
            {
              title: 'License Details',
              rows: [
                { label: 'Product', value: props.model || props.assetName || '-' },
                { label: 'Publisher', value: props.brand || '-' },
                { label: 'License Key', value: softwareLicenseKey },
                { label: 'License Type', value: softwareLicenseType },
                { label: 'Version', value: softwareVersion },
                { label: 'Expiration Date', value: softwareExpirationDate },
              ],
            },
            {
              title: 'Allocation & Ownership',
              rows: [
                { label: 'Total Seats', value: softwareTotalSeats },
                { label: 'Available Seats', value: softwareAvailableSeats },
                { label: 'Assigned To', value: props.assignedTo || '-' },
                { label: 'Group', value: props.group || '-' },
                { label: 'Owner', value: props.owner || '-' },
              ],
            },
            {
              title: 'Record Metadata',
              rows: [
                { label: 'Asset ID', value: props.assetTag || '-' },
                { label: 'Purchase Date', value: props.purchaseDate || '-' },
                { label: 'Registered On', value: props.dateCreated || '-' },
                { label: 'Last Updated', value: props.updatedAt || '-' },
              ],
            },
          ] : undefined}
          hideMaintenance={isSoftware}
          maintenanceRecords={props.maintenanceEvents}
          onQRCodeClick={props.onQRCodeClick}
          onViewAllMaintenance={props.onViewAllMaintenance}
        />
      ),
    });

    if (!isSoftware) {
      tabsList.push({
        id: isFurniture ? 'physical-details' : 'technical-details',
        label: isFurniture ? 'Physical Details' : 'Technical Details',
        content: props.isLoading ? <AssetLoadingSkeleton /> : <TechnicalDetailsTab specs={props.specs || {}} note={props.techNote} />,
      });
    }

    if (props.vendorInfo || props.purchaseDate) {
      tabsList.push({
        id: 'purchase-details',
        label: 'Purchase Details',
        content: props.isLoading ? (
          <AssetLoadingSkeleton />
        ) : (
          <PurchaseDetailsTab
            currency={props.currency || 'USD'}
            purchaseDate={props.purchaseDate || '-'}
            basePrice={props.basePrice || '-'}
            shippingCost={props.shippingCost || '-'}
            tax={props.tax || '-'}
            totalCost={props.totalCost || '-'}
            warrantyPeriod={props.warrantyPeriod || '-'}
            totalRepairCost={props.totalRepairCost}
            invoicePdf={props.invoiceUrl}
            vendor={props.vendorInfo || { vendorId: '', vendorName: 'N/A' }}
            onCurrencyChange={props.onCurrencyChange}
          />
        ),
      });
    }

    if (!isSoftware) {
      tabsList.push({
        id: 'history',
        label: 'History',
        content: props.isLoading ? <AssetLoadingSkeleton /> : <HistoryTab events={props.historyEvents ?? []} onViewAll={props.onViewAllHistory} />,
      });
    }

    return tabsList;
  }, [props]);

  const actions: SlidePanelAction[] = [
    { id: 'edit', label: 'Edit', variant: 'outline', onClick: props.onEdit },
    { id: 'action', label: getActionButtonLabel(), variant: 'default', onClick: props.onActionButtonClick },
  ];

  const resolvedPanelTitle = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate">{props.assetName || props.model || 'Asset'}</span>
      <StatusBadge
        variant="metadata"
        label={`ID: ${props.assetTag || '-'}`}
      />
      <StatusBadge value={props.status} showIcon />
    </div>
  );

  return (
    <TabbedPanel
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={resolvedPanelTitle}
      tabs={tabs}
      defaultTabId="asset-details"
      actions={actions}
    />
  );
}