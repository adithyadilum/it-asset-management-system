'use client';

import { useRef } from 'react';
import { AssetRegistryClient } from './asset-registry-client';
import { AssetRegistryPanels } from './asset-registry-panels';
import {
    type RegistryViewConfig,
} from './registry-config';

interface AssetRegistryContentProps {
    config: RegistryViewConfig;
    initialCategories: Array<{ id: number; name: string; prefix: string; pillar: string }>;
    initialResult: {
        data: Array<{
            id: string;
            assetTag: string;
            name: string | null;
            serialNumber: string | null;
            status: string;
            condition: string | null;
            categoryId: number;
            category: string;
            pillar: string;
            model: string;
            locationId: number | null;
            location: string | null;
            assignedTo: string | null;
            instanceAttributes: Record<string, unknown> | null;
            updatedAt: Date | string;
        }>;
        meta: {
            total: number;
            page: number;
            pageSize: number;
            totalPages: number;
        };
    };
    currentPanel?: string;
    recordId?: string;
    closePanelUrl: string;
    pillar: string;
    manualStatuses?: Array<{ 
        value: string; 
        label: string; 
        colorTheme?: string; 
        iconName?: string; 
    }>;
}

export function AssetRegistryContent({
    config,
    initialCategories,
    initialResult,
    currentPanel,
    recordId,
    closePanelUrl,
    pillar,
    manualStatuses = [],
}: AssetRegistryContentProps) {
    const onStatusUpdateRef = useRef<(assetId: string, nextStatus: string) => void>(() => { });

    return (
        <div className="flex h-full w-full overflow-hidden bg-slate-50">
            <AssetRegistryClient
                config={config}
                initialCategories={initialCategories}
                initialResult={initialResult}
                currentPanel={currentPanel}
                manualStatuses={manualStatuses}
                onStatusUpdateRef={onStatusUpdateRef}
            />
            <AssetRegistryPanels
                currentPanel={currentPanel}
                recordId={recordId}
                closePanelUrl={closePanelUrl}
                pillar={pillar}
                manualStatuses={manualStatuses}
                onStatusUpdateRef={onStatusUpdateRef}
            />
        </div>
    );
}
