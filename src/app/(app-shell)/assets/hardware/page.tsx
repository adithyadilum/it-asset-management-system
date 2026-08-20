import { AssetRegistryShell } from '@/components/features/asset-registry/asset-registry-shell';

export default function HardwarePage({
  searchParams,
}: {
  searchParams: Promise<{
    panel?: string | string[];
    animate?: string | string[];
    id?: string | string[];
  }>;
}) {
  return <AssetRegistryShell view="hardware" searchParams={searchParams} />;
}
