'use client';

import { useState } from 'react';
import { AppWindow } from 'lucide-react';

import type { EmployeeSoftwareAsset } from '@/actions/employee';
import {
  EmployeeAssetDetailDialog,
  type EmployeeAssetDialogTarget,
} from '@/components/features/my-assets/employee-asset-detail-dialog';
import { AssetCard } from '@/components/shared/asset-card';
import { formatAssetName } from '@/lib/asset-name';

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function EmployeeSoftwareGrid({
  assets,
}: {
  assets: EmployeeSoftwareAsset[];
}) {
  const [detailTarget, setDetailTarget] =
    useState<EmployeeAssetDialogTarget | null>(null);

  return (
    <>
      <div className="mt-3 grid gap-4 xl:grid-cols-3">
        {assets.map((asset) => (
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
            assignedDate={formatDay(asset.allocatedDate)}
            onClick={() =>
              setDetailTarget({
                kind: 'software',
                asset,
                icon: <AppWindow className="h-8 w-8" />,
              })
            }
          />
        ))}
      </div>

      <EmployeeAssetDetailDialog
        target={detailTarget}
        open={detailTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null);
        }}
      />
    </>
  );
}

export default EmployeeSoftwareGrid;
