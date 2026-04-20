'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AssetDetailsPanel } from '@/components/shared/slide-panels/asset-details-panel';
import { useAssetSelection } from '@/hooks/use-asset-selection';

const MOCK_ASSET_ID = 'FRN-CHR-001';

export default function FurniturePage() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { assetData, isLoading, selectAsset, clearSelection } = useAssetSelection();

  const handleOpenPanel = async () => {
    await selectAsset(MOCK_ASSET_ID);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    clearSelection();
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="shrink-0">
        <h1 className="text-3xl font-bold text-slate-900">Office Furniture & Fixtures</h1>
        <p className="text-sm text-slate-600 mt-1">Test the slide-out panel for furniture assets</p>
      </div>

      {/* Horizontal Flex Wrapper for Grid and Panel */}
      <div className="flex flex-1 min-h-0 flex-row">
        {/* Data Grid Placeholder */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 border-dashed flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-slate-600 font-medium text-lg">Data Grid Area</p>
            <p className="text-sm text-slate-500 mt-2">Space reserved for furniture list grid (Epic 6)</p>
          </div>

          <button
            onClick={handleOpenPanel}
            className="flex items-center gap-2 px-6 py-3 bg-[#040d5a] text-white rounded-lg hover:bg-blue-900 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Open Test Panel (FRN-CHR-001)
          </button>
        </div>

        {/* Asset Details Panel */}
        {assetData && (
          <AssetDetailsPanel
            isOpen={isPanelOpen}
            onClose={handleClosePanel}
            isLoading={isLoading}
            
            assetId={assetData.details.asset.id}
            assetTag={assetData.details.asset.assetTag}
            assetCategory="Office Furniture"
            model={assetData.details.model.name}
            brand={assetData.details.model.brand.name}
            serialNumber={assetData.details.asset.serialNumber ?? undefined}
            owner={assetData.details.assignment?.assignedToUser?.name}
            group="Admin"
            location={assetData.details.location?.name}
            condition={assetData.details.asset.condition || 'N/A'}
            warranty={assetData.details.purchase?.warrantyExpiry ? 'Active' : 'Expired'}
            lastRepaired={
              assetData.details.asset.updatedAt
                ? new Date(assetData.details.asset.updatedAt).toLocaleDateString('en-GB')
                : '-'
            }
            dateCreated={new Date(assetData.details.asset.createdAt).toLocaleDateString('en-GB')}
            updatedAt={new Date(assetData.details.asset.updatedAt).toLocaleDateString('en-GB')}
            note={assetData.details.asset.name || undefined}
            status={assetData.details.asset.status}
            imageUrl="/asset-placeholder.png"
            
            specs={(assetData.details.asset.instanceAttributes as Record<string, string | number | undefined>) || {}}
            
            currency={assetData.details.purchase?.currencyCode || 'USD'}
            purchaseDate={assetData.details.purchase?.purchaseDate ? new Date(assetData.details.purchase.purchaseDate).toLocaleDateString('en-GB') : '-'}
            basePrice={assetData.details.purchase?.basePrice || '-'}
            shippingCost={assetData.details.purchase?.shippingCost || '-'}
            tax={assetData.details.purchase?.tax || '-'}
            totalCost={assetData.details.purchase?.totalCost || '-'}
            warrantyPeriod={assetData.details.purchase?.warrantyExpiry ? '1 Year' : '-'}
            invoiceUrl={assetData.details.purchase?.invoiceUrl || undefined}
            
            vendorInfo={
              assetData.details.vendor
                ? {
                    vendorId: assetData.details.vendor.id.toString(),
                    vendorName: assetData.details.vendor.companyName,
                    contactPerson: 'Contact',
                    contactNumber: assetData.details.vendor.contactInfo || '-',
                    email: 'vendor@email.com',
                    website: 'www.vendor.com',
                    address: 'Vendor Address',
                  }
                : undefined
            }
            
            historyEvents={assetData.history}
            maintenanceEvents={assetData.maintenance}
            
            onEdit={() => alert('Edit functionality coming soon')}
            onActionButtonClick={() => alert('Transfer functionality coming soon')}
            onViewAllHistory={() => alert('View all history page coming soon')}
            onQRCodeClick={() => alert('QR Code modal coming soon')}
            onCurrencyChange={(currency) => console.log('Currency changed to:', currency)}
          />
        )}
      </div>
    </div>
  );
}