import { AssetRegistryShell } from '@/components/features/asset-registry/asset-registry-shell';

export default function OfficeElectronicsPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string | string[]; animate?: string | string[]; id?: string | string[] }>;
}) {
  return <AssetRegistryShell view="office-electronics" searchParams={searchParams} />;
}
