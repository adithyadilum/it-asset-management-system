import {
  getAssetsByPillar,
  getCategoriesByPillar,
} from '@/actions/assets-registry';
import {
  REGISTRY_VIEW_CONFIGS,
  type RegistryView,
} from '@/components/features/assets-registry/registry-config';
import { AssetRegistryClient } from './asset-registry-client';

export interface AssetRegistryShellProps {
  view: RegistryView;
}

export async function AssetRegistryShell({ view }: AssetRegistryShellProps) {
  const config = REGISTRY_VIEW_CONFIGS[view];

  const [categories, initialResult] = await Promise.all([
    getCategoriesByPillar(config.pillar),
    getAssetsByPillar({
      pillar: config.pillar,
      page: 1,
      pageSize: config.defaultPageSize,
    }),
  ]);

  return (
    <AssetRegistryClient
      config={config}
      initialCategories={categories}
      initialResult={initialResult}
    />
  );
}
