'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { TabbedPanel, type TabbedPanelTab } from '@/components/shared/slide-panels/tabbed-panel';
import { type SlidePanelAction } from '@/components/shared/slide-panel';
import { AssetDetailsTab } from './asset-details-tab';
import { TechnicalDetailsTab } from './technical-details-tab';
import { PurchaseDetailsTab } from './purchase-details-tab';
import { HistoryTab } from './history-tab';
import { AllocationsTab, type AllocationUser } from './allocations-tab';
import type { HistoryEvent, MaintenanceEvent } from '@/lib/data/asset-details-repo';
import { AssetLoadingSkeleton } from './asset-loading-skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { InteractiveStatusBadge } from '@/components/shared/interactive-status-badge';

// Epic 15: Imports for Maintenance Integration
import { getAllAssetAuditHistory } from '@/actions/audit-log';
import { format } from 'date-fns';
import { RecentMaintenance } from './recent-maintenance';

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
  sourceCurrency?: string;
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

  // Allocations (Software only)
  allocations?: AllocationUser[];
  totalSeats?: number;

  // Actions
  onEdit?: () => void;
  onActionButtonClick?: () => void;
  onViewAllHistory?: () => void;
  onViewAllMaintenance?: () => void;
  onQRCodeClick?: () => void;
  onCurrencyChange?: (currency: string) => void;
  onRevokeAllocation?: (userId: string) => void;
  manualStatuses?: Array<{ 
    value: string; 
    label: string; 
    colorTheme?: string; 
    iconName?: string; 
  }>;
  onStatusChanged?: (nextStatus: string) => void;
  hideActions?: boolean;
  additionalTabs?: TabbedPanelTab[];
}

export function AssetDetailsPanel(props: AssetDetailsPanelProps) {
  const [activeTabId, setActiveTabId] = useState('asset-details');
  const [isExporting, setIsExporting] = useState(false);

  // ======================================================

  const getActionButtonLabel = useCallback(() => {
    if (props.assetCategory === 'Office Furniture') return 'Transfer';
    if (props.assetCategory === 'Software') return 'Return';
    return 'Request Return';
  }, [props.assetCategory]);

  const tabs: TabbedPanelTab[] = useMemo(() => {
    const tabsList: TabbedPanelTab[] = [];
    const isSoftware = props.assetCategory === 'Software';
    const isFurniture = props.assetCategory === 'Office Furniture';

    // SAM Data mapping from dev branch
    const softwareLicenseKey = props.serialNumber || props.specs?.license_key?.toString() || '-';
    const softwareLicenseType = props.specs?.license_type?.toString() || 'Subscription';
    const softwareVersion = props.specs?.version?.toString() || '-';
    const softwareExpirationDate = props.specs?.expiry_date?.toString() || props.specs?.expiration_date?.toString() || '-';
    const softwareTotalSeats = props.specs?.max_seats?.toString() || props.specs?.total_seats?.toString() || '-';
    const softwareAvailableSeats = props.specs?.available_seats?.toString() || '-';

    // 1. Compute Dynamic Grid Fields based on Category
    const detailsFields = [];

    // Dev branch resolution: Using assetTag
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
        <div className="flex flex-col pb-6">
          {/* SAM Upgrade from dev branch, with maintenance hidden so we can use our custom Epic 15 UI */}
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
            hideMaintenance={true} // Force hide so our dynamic UI takes over
            onQRCodeClick={props.onQRCodeClick}
          />

          {/* ============ EPIC 15: NEW DYNAMIC MAINTENANCE UI ============ */}
          {!isSoftware && (
            <RecentMaintenance 
              assetTag={props.assetTag} 
              isOpen={props.isOpen} 
              onViewAll={props.onViewAllMaintenance} 
            />
          )}
          {/* ==================================================== */}
        </div>
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
            sourceCurrency={props.sourceCurrency || props.currency || 'USD'}
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

    if (isSoftware) {
      const allocatedCount = props.allocations?.length ?? 0;
      const totalSeats = props.totalSeats ?? 0;

      tabsList.push({
        id: 'allocations',
        label: 'Allocations',
        content: props.isLoading ? (
          <AssetLoadingSkeleton />
        ) : (
          <AllocationsTab
            totalSeats={totalSeats}
            allocatedCount={allocatedCount}
            allocations={props.allocations ?? []}
            onRevoke={props.onRevokeAllocation}
            isReadOnly={true}
          />
        ),
      });
    }

    if (!isSoftware) {
      tabsList.push({
        id: 'history',
        label: 'History',
        content: props.isLoading ? <AssetLoadingSkeleton /> : <HistoryTab key={props.assetId} assetId={props.assetId} />,
      });
    }
    if (props.additionalTabs) {
      tabsList.push(...props.additionalTabs);
    }

    return tabsList;
  }, [props]);

  const handleExportCSV = useCallback(async () => {
    try {
      setIsExporting(true);
      const rows = await getAllAssetAuditHistory(props.assetId);

      const escapeCsvValue = (value: string) => `"${value.replaceAll('"', '""')}"`;

      const header = [
        "Timestamp",
        "User",
        "Action Taken",
        "Target Entity",
        "IP Address",
      ];

      const csvRows = rows.map((row) => {
        const user = row.performedBy
          ? `${row.performedBy.name} <${row.performedBy.email}>`
          : "Unknown";

        const target = row.entityLabel && row.entityLabel.trim().length > 0
          ? row.entityLabel
          : `${row.entityType}: ${row.entityId}`;

        const timestamp = row.performedAt instanceof Date
          ? row.performedAt
          : new Date(row.performedAt);

        return [
          Number.isNaN(timestamp.getTime()) ? String(row.performedAt) : format(timestamp, "yyyy-MM-dd HH:mm:ss"),
          user,
          row.actionType,
          target,
          row.ipAddress ?? "-",
        ].map(escapeCsvValue);
      });

      const csv = [header.map(escapeCsvValue).join(","), ...csvRows.map((row) => row.join(","))].join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `asset-${props.assetTag}-history-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    } finally {
      setIsExporting(false);
    }
  }, [props.assetId, props.assetTag]);

  const actions: SlidePanelAction[] = useMemo(() => {
    if (props.hideActions) return [];

    if (activeTabId === 'history') {
      return [
        {
          id: 'export-csv',
          label: isExporting ? 'Exporting...' : 'Export to CSV',
          variant: 'default',
          onClick: handleExportCSV,
          disabled: isExporting
        }
      ];
    }

    const isDisposed = props.status === 'Disposed';
    const isPendingDisposal = props.status === 'Pending Disposal';
    
    const list: SlidePanelAction[] = [];

    // Disposed assets cannot be edited
    if (!isDisposed) {
      list.push({ id: 'edit', label: 'Edit', variant: 'outline', onClick: props.onEdit });
    }

    // Disposed and Pending Disposal assets cannot be assigned/returned
    if (!isDisposed && !isPendingDisposal) {
      list.push({ id: 'action', label: getActionButtonLabel(), variant: 'default', onClick: props.onActionButtonClick });
    }

    return list;
  }, [activeTabId, isExporting, props.onEdit, props.onActionButtonClick, getActionButtonLabel, handleExportCSV, props.status, props.hideActions]);

  const resolvedPanelTitle = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate">{props.assetName || props.model || 'Asset'}</span>
      <StatusBadge
        variant="metadata"
        label={`ID: ${props.assetTag || '-'}`}
      />
      <InteractiveStatusBadge
        assetId={props.assetId}
        currentStatus={props.status}
        availableStatuses={props.manualStatuses ?? []}
        hasActiveAssignment={Boolean(props.assignedTo && props.assignedTo !== '-')}
        onStatusChanged={props.onStatusChanged}
      />
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
      onTabChange={setActiveTabId}
    />
  );
}