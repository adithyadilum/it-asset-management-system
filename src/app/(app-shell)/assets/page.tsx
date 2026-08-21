import { Suspense } from 'react';

import { AssetRegistryShell } from '@/components/features/asset-registry/asset-registry-shell';
import { AssetRegistrySkeleton } from '@/components/features/asset-registry/asset-registry-skeleton';

export default function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    panel?: string | string[];
    animate?: string | string[];
    id?: string | string[];
  }>;
}) {
  // The shell reads the session and loads the registry, none of which can be
  // prerendered. Streaming it means the sidebar, header and this page's chrome
  // paint immediately and the table fills in, rather than the whole navigation
  // blocking on the slowest query.
  return (
    <Suspense fallback={<AssetRegistrySkeleton />}>
      <AssetRegistryShell view="unified" searchParams={searchParams} />
    </Suspense>
  );
}
