import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { requirePageAuth } from '@/lib/auth/page-guard';
import {
  getCurrentEmployeeAssets,
  getCurrentEmployeeSoftwareAssets,
} from '@/actions/employee';
import { getPortalAlerts } from '@/lib/data/portal-repo';
import { EmployeeAlerts } from '@/components/features/dashboard/employee/employee-alerts';
import { EmployeeAssetGrid } from '@/components/features/my-assets/employee-asset-grid';
import { AssetCard } from '@/components/shared/asset-card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { AppWindow } from 'lucide-react';
import { SUPPORT_LABEL, SUPPORT_MAILTO } from '@/lib/constants';
import { formatAssetName } from '@/lib/asset-name';

/**
 * No instant shell is possible here: the `(app-shell)` layout above blocks on
 * `connection()` to read the session, so nothing on this route can be
 * prerendered. Without this Next reports "Could not validate `instant`" on
 * every visit — the layout's config does not cascade to pages.
 */
export const instant = false;

async function MyAssetsPageContent() {
  const user = await requirePageAuth();

  const [employeeAssets, softwareAssets, alerts] = await Promise.all([
    getCurrentEmployeeAssets(),
    getCurrentEmployeeSoftwareAssets(),
    getPortalAlerts(user.id),
  ]);
  const hasAnyAssets = employeeAssets.length > 0 || softwareAssets.length > 0;

  return (
    <section className="px-4 pb-4 pt-6 md:px-6 md:pb-6">
      <h1 className="text-foreground text-2xl font-semibold leading-8">
        My Assets
      </h1>
      <p className="text-muted-foreground text-base font-normal leading-6">
        Here are the assets and software currently assigned to you.
      </p>
      <div className="mt-6 flex w-full flex-col gap-4">
        <EmployeeAlerts alerts={alerts} />
      </div>

      {hasAnyAssets ? (
        <div className="mt-4 space-y-8">
          {employeeAssets.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold text-foreground">
                Assigned Equipment
              </h2>
              <EmployeeAssetGrid assets={employeeAssets} />
            </section>
          ) : null}

          {softwareAssets.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold text-foreground">
                Software Access
              </h2>
              <div className="mt-3 grid gap-4 xl:grid-cols-3">
                {softwareAssets.map((asset) => (
                  <AssetCard
                    key={asset.allocationId}
                    assetType={`${asset.licenseType} Seat`}
                    name={formatAssetName(asset.brandName, asset.modelName)}
                    status={asset.status}
                    icon={<AppWindow className="h-8 w-8" />}
                    // Software has a publisher logo on its model like anything
                    // else; only these cards were never given it.
                    imageUrl={asset.imageUrl}
                    assetId={asset.assetTag}
                    assignedDate={new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(new Date(asset.allocatedDate))}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-3">
            <Empty className="min-h-52 rounded-md border-0 p-4">
              <EmptyHeader className="max-w-md">
                <EmptyTitle>No active assets assigned</EmptyTitle>
                <EmptyDescription className="max-w-md text-balance">
                  We couldn&apos;t find any equipment or software linked to your
                  profile.
                  <br />
                  If you&apos;re expecting access, check back later or contact{' '}
                  <a
                    href={SUPPORT_MAILTO}
                    className="underline underline-offset-2"
                  >
                    {SUPPORT_LABEL}
                  </a>
                  .
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Streams rather than blocks.
 *
 * The body above reads the session and queries the database, none of
 * which can be prerendered. Keeping the default export synchronous lets
 * this route paint its chrome immediately and fill in the content when
 * the data arrives, instead of the navigation waiting on the slowest
 * query.
 */
export default function MyAssetsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyAssetsPageContent />
    </Suspense>
  );
}
