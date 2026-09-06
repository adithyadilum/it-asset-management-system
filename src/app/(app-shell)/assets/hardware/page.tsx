import { Suspense } from 'react';

import { AssetRegistryShell } from '@/components/features/asset-registry/asset-registry-shell';
import { AssetRegistrySkeleton } from '@/components/features/asset-registry/asset-registry-skeleton';

/**
 * No instant shell is possible here: the `(app-shell)` layout above blocks on
 * `connection()` to read the session, so nothing on this route can be
 * prerendered. Without this Next reports "Could not validate `instant`" on
 * every visit — the layout's config does not cascade to pages.
 */
export const instant = false;

export default function HardwarePage({
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
      <AssetRegistryShell view="hardware" searchParams={searchParams} />
    </Suspense>
  );
}
