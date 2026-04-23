'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { TabbedPanel, type TabbedPanelTab } from '@/components/shared/slide-panels/tabbed-panel';
import { type SlidePanelAction } from '@/components/shared/slide-panel';
import { AssetDetailsTab } from './asset-details-tab';
import { TechnicalDetailsTab } from './technical-details-tab';
import { PurchaseDetailsTab } from './purchase-details-tab';
import { HistoryTab } from './history-tab';
import type { HistoryEvent, MaintenanceEvent } from '@/lib/data/asset-details-repo';
import { AssetLoadingSkeleton } from './asset-loading-skeleton';

// New Imports for Maintenance Integration
import { getAssetMaintenanceHistory } from '@/actions/maintenance';
import type { AssetMaintenanceRecord } from '@/types/maintenance';
import { Badge } from '@/components/ui/badge';

export interface AssetDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  
  // Base Asset
  assetId: string;
  assetTag: string;
  assetCategory: 'IT & Digital' | 'Software' | 'Office Furniture' | 'Office Electronics' | string;
  model: string;
  brand: string;
  serialNumber?: string;
  owner?: string;
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
  maintenanceEvents?: MaintenanceEvent[]; // Keeping for backwards compatibility
  
  // Actions
  onEdit?: () => void;
  onActionButtonClick?: () => void;
  onViewAllHistory?: () => void;
  onViewAllMaintenance?: () => void;
  onQRCodeClick?: () => void;
  onCurrencyChange?: (currency: string) => void;
}

export function AssetDetailsPanel(props: AssetDetailsPanelProps) {
  // ============ DYNAMIC MAINTENANCE FETCHING ============
  const [maintenanceHistory, setMaintenanceHistory] = useState<AssetMaintenanceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      if (!props.assetTag) return; 
      
      try {
        setIsLoadingHistory(true);
        const history = await getAssetMaintenanceHistory(props.assetTag, 3);
        setMaintenanceHistory(history);
      } catch (error) {
        console.error('Failed to fetch maintenance history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    if (props.isOpen) {
      fetchHistory();
    }
  }, [props.assetTag, props.isOpen]);
  // ======================================================

  const getActionButtonLabel = () => {
    if (props.assetCategory === 'Office Furniture') return 'Transfer';
    if (props.assetCategory === 'Software') return 'Return';
    return 'Request Return';
  };

  const tabs: TabbedPanelTab[] = useMemo(() => {
    const tabsList: TabbedPanelTab[] = [];
    const isSoftware = props.assetCategory === 'Software';
    const isFurniture = props.assetCategory === 'Office Furniture';

    // 1. Compute Dynamic Grid Fields based on Category
    const detailsFields = [];
    detailsFields.push({ label: 'Asset ID', value: props.assetId });
    
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
        { label: 'License Type', value: props.specs?.license_type?.toString() || 'Subscription' },
        { label: 'Version', value: props.specs?.version?.toString() || '-' },
        { label: 'Publisher', value: props.brand },
        { label: 'Assigned to', value: props.owner || '-' },
        { label: 'Group', value: props.group || '-' }
      );
    } else {
      detailsFields.push(
        { label: 'Category', value: props.assetCategory },
        { label: 'Model', value: props.model },
        { label: 'Brand', value: props.brand },
        { label: 'Serial Number', value: props.serialNumber || '-' },
        { label: 'Owner', value: props.owner || '-' },
        { label: 'Assigned to', value: props.owner || '-' },
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
          {/* Old Tab Layout - Notice hideMaintenance is forcefully set to true now */}
          <AssetDetailsTab
            assetTag={props.assetTag}
            imageUrl={props.imageUrl}
            status={props.status}
            note={props.note}
            fields={detailsFields}
            hideMaintenance={true} 
            onQRCodeClick={props.onQRCodeClick}
          />

          {/* ============ NEW DYNAMIC MAINTENANCE UI ============ */}
          {!isSoftware && (
            <div className="mt-8 shrink-0 px-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
                  Recent Maintenance
                </h3>
                {maintenanceHistory.length > 0 && props.onViewAllMaintenance && (
                  <button onClick={props.onViewAllMaintenance} className="text-[13px] text-[#040d5a] hover:underline font-medium">
                    View All
                  </button>
                )}
              </div>
              
              {isLoadingHistory ? (
                  <div className="space-y-3">
                    <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
                    <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
                  </div>
              ) : maintenanceHistory.length > 0 ? (
                  <div className="space-y-3">
                    {maintenanceHistory.map((record) => (
                      <div key={record.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-[14px] text-slate-900">
                            {record.ticketType === 'VENDOR' ? record.vendorName : 'Internal Repair'}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={
                              record.status === 'COMPLETED' 
                              ? 'bg-green-50 text-green-700 border-green-200 font-normal shadow-sm' 
                              : record.status === 'ACTIVE'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 font-normal shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 font-normal shadow-sm'
                            }
                          >
                            {record.status}
                          </Badge>
                        </div>
                        
                        <p className="text-[13px] text-slate-600 mb-3 line-clamp-2">
                          {record.reportedIssue}
                        </p>
                        
                        <div className="flex justify-between items-center text-[12px] text-slate-500 font-medium pt-3 border-t border-slate-200/60">
                          <span>
                            {record.actualCompletionDate 
                              ? new Date(record.actualCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                              : 'In Progress'}
                          </span>
                          {record.actualCost && (
                            <span className="text-slate-700">
                              ${parseFloat(record.actualCost).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
              ) : (
                <div className="flex items-center justify-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <p className="text-sm text-slate-500">No maintenance records found.</p>
                </div>
              )}
            </div>
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

    if (!isSoftware && props.historyEvents && props.historyEvents.length > 0) {
      tabsList.push({
        id: 'history',
        label: 'History',
        content: props.isLoading ? <AssetLoadingSkeleton /> : <HistoryTab events={props.historyEvents} onViewAll={props.onViewAllHistory} />,
      });
    }

    return tabsList;
  }, [props, maintenanceHistory, isLoadingHistory]); // <--- Added missing dependencies here!

  const actions: SlidePanelAction[] = [
    { id: 'edit', label: 'Edit', variant: 'outline', onClick: props.onEdit },
    { id: 'action', label: getActionButtonLabel(), variant: 'default', onClick: props.onActionButtonClick },
  ];

  return (
    <TabbedPanel
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={`${props.model} - ${props.assetTag}`}
      tabs={tabs}
      defaultTabId="asset-details"
      actions={actions}
    />
  );
}