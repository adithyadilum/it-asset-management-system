import { AssetRegistryShell } from '@/components/features/asset-registry/asset-registry-shell';

export default function FurniturePage({
  searchParams,
}: {
  searchParams: Promise<{
    panel?: string | string[];
    animate?: string | string[];
    id?: string | string[];
  }>;
}) {
  return <AssetRegistryShell view="furniture" searchParams={searchParams} />;
}
