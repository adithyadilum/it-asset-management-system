import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/shared/table-skeleton';

/**
 * Placeholder shown while an asset registry page streams in.
 *
 * Mirrors the real chrome from `asset-registry-client` — same container, same
 * padding, a heading-sized block where the category selector sits and a toolbar
 * row above the table — so the page does not jump when the data arrives.
 */
export function AssetRegistrySkeleton() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-muted">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-background p-6">
        {/* Category selector */}
        <div className="mb-4">
          <Skeleton className="h-8 w-56" />
        </div>

        {/* Search and filter toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <TableSkeleton
          rowCount={8}
          columnWidths={[
            'w-[14%]',
            'w-[22%]',
            'w-[16%]',
            'w-[14%]',
            'w-[16%]',
            'w-[12%]',
          ]}
        />
      </main>
    </div>
  );
}
