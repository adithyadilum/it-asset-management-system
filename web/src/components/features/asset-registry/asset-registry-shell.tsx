import { cache } from 'react';

import {
  getAssetsByPillar,
  getCategoriesByPillar,
} from '@/actions/asset-registry';
import {
  REGISTRY_VIEW_CONFIGS,
  type RegistryView,
} from '@/components/features/asset-registry/registry-config';
import { AssetRegistryContent } from './asset-registry-content';
import { getManualOverrideStatuses } from '@/actions/statuses';

const getCachedCategoriesByPillar = cache(
  (pillar: string) => getCategoriesByPillar(pillar)
);

export interface AssetRegistryShellProps {
  view: RegistryView;
  searchParams?: Promise<{
    panel?: string | string[];
    animate?: string | string[];
    id?: string | string[];
  }>;
}

export async function AssetRegistryShell({ view, searchParams }: AssetRegistryShellProps) {
  const config = REGISTRY_VIEW_CONFIGS[view];

  const params = searchParams ? await searchParams : {};
  const currentPanel = Array.isArray(params.panel) ? params.panel[0] : params.panel;
  const recordId = Array.isArray(params.id) ? params.id[0] : params.id;
  const closePanelUrl = `/assets/${view}`;

  const [categories, initialResult, manualStatuses] = await Promise.all([
    getCachedCategoriesByPillar(config.pillar),
    getAssetsByPillar({
      pillar: config.pillar,
      page: 1,
      pageSize: config.defaultPageSize,
    }),
    getManualOverrideStatuses(),
  ]);

  return (
    <AssetRegistryContent
      config={config}
      initialCategories={categories}
      initialResult={initialResult}
      currentPanel={currentPanel}
      recordId={recordId}
      closePanelUrl={closePanelUrl}
      pillar={config.pillar}
      manualStatuses={manualStatuses}
    />
  );
}
