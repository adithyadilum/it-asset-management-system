import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/shared/table-skeleton';

/**
 * Generic placeholder for a management page while its data streams in.
 *
 * Every page inside the app shell reads the session and queries the database,
 * none of which can be prerendered. Rendering this from a `<Suspense>` boundary
 * lets the route paint its chrome immediately instead of blocking on the
 * slowest query, and is what stops Next reporting "uncached data during
 * prerendering or a navigation".
 *
 * Deliberately generic. A dozen bespoke skeletons would drift out of step with
 * the pages they stand in for; this matches the shape they share — a heading, a
 * toolbar row, and a table — closely enough that the swap is not jarring.
 * Pages with a genuinely different shape provide their own, as the asset
 * registry and dashboard do.
 */
export function PageSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  return (
    <div className="flex h-full w-full flex-col rounded-xl bg-background p-6">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-32" />
        <div className="ml-auto">
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <TableSkeleton
        rowCount={rowCount}
        columnWidths={['w-[18%]', 'w-[24%]', 'w-[18%]', 'w-[20%]', 'w-[14%]']}
      />
    </div>
  );
}
