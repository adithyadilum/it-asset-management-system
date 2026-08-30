'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Armchair,
  Code,
  HardDrive,
  Laptop,
  Monitor,
  Smartphone,
  Speaker,
} from 'lucide-react';

import { acceptAssignmentAction } from '@/actions/employee';
import type { EmployeeAssignedAsset } from '@/actions/employee';
import { AcceptAssignmentDialog } from '@/components/features/dashboard/employee/accept-assignment-dialog';
import { RejectionDialog } from '@/components/features/dashboard/employee/rejection-dialog';
import { AssetCard } from '@/components/shared/asset-card';
import { tiqriToast } from '@/components/shared/sonner';
import { formatAssetName } from '@/lib/asset-name';
import type { PendingAcceptanceItem } from '@/lib/data/portal-repo';

const PILLAR_PRESENTATION: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  Hardware: { label: 'Device', icon: <Laptop className="h-8 w-8" /> },
  Software: { label: 'Software', icon: <Code className="h-8 w-8" /> },
  'Office Furniture': {
    label: 'Furniture',
    icon: <Armchair className="h-8 w-8" />,
  },
  'Office Electronics': {
    label: 'Electronics',
    icon: <Speaker className="h-8 w-8" />,
  },
};

function getAssetPresentation(pillar: string | undefined, modelName: string) {
  if (pillar && PILLAR_PRESENTATION[pillar]) {
    return PILLAR_PRESENTATION[pillar];
  }

  // Fallback: model name heuristic for legacy data
  const normalized = modelName.trim().toLowerCase();
  if (
    normalized.includes('macbook') ||
    normalized.includes('laptop') ||
    normalized.includes('thinkpad')
  ) {
    return { label: 'Laptop', icon: <Laptop className="h-8 w-8" /> };
  }
  if (
    normalized.includes('iphone') ||
    normalized.includes('phone') ||
    normalized.includes('mobile')
  ) {
    return { label: 'Phone', icon: <Smartphone className="h-8 w-8" /> };
  }
  if (normalized.includes('monitor') || normalized.includes('display')) {
    return { label: 'Monitor', icon: <Monitor className="h-8 w-8" /> };
  }
  return { label: 'Asset', icon: <HardDrive className="h-8 w-8" /> };
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

/** The shape the rejection dialog expects, built from the card's own row. */
function toPendingItem(asset: EmployeeAssignedAsset): PendingAcceptanceItem {
  return {
    assignmentId: asset.assignmentId,
    assetId: asset.assetId,
    assetTag: asset.assetTag,
    modelName: formatAssetName(asset.brandName, asset.modelName),
    category: asset.categoryName,
    assignedDate: asset.assignedDate,
    assignedByName: asset.assignedByName,
  };
}

/**
 * The employee's assigned equipment.
 *
 * Accept and Decline live on the card rather than in the alerts strip above:
 * an employee with three pending assignments had three identical banners and
 * had to match each dialog back to an asset by name.
 */
export function EmployeeAssetGrid({
  assets,
}: {
  assets: EmployeeAssignedAsset[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<EmployeeAssignedAsset | null>(null);
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const handleConfirmAccept = async () => {
    if (!selected) return;

    try {
      const result = await acceptAssignmentAction(selected.assignmentId);
      if (!result?.success) {
        throw new Error(result?.error ?? 'Failed to accept assignment');
      }

      tiqriToast.success('Assignment accepted.');
      setIsAcceptOpen(false);
      setSelected(null);
      router.refresh();
    } catch (error) {
      tiqriToast.error(
        error instanceof Error ? error.message : 'Failed to accept assignment'
      );
    }
  };

  return (
    <>
      <div className="mt-3 grid gap-4 xl:grid-cols-3">
        {assets.map((asset) => {
          const presentation = getAssetPresentation(
            asset.pillar,
            asset.modelName
          );
          const awaitingAcknowledgement =
            asset.assignmentState === 'pending approval';

          return (
            <AssetCard
              key={asset.assignmentId}
              // The category, not the pillar: "Laptop" tells the holder what
              // they have, "Device" does not.
              assetType={asset.categoryName || presentation.label}
              name={formatAssetName(asset.brandName, asset.modelName)}
              status={asset.status}
              icon={presentation.icon}
              imageUrl={asset.imageUrl}
              assetId={asset.assetTag}
              assignmentState={asset.assignmentState}
              expectedReturnDate={asset.expectedReturnDate}
              isOverdue={asset.isOverdue}
              assignedDate={formatDay(asset.assignedDate)}
              actions={
                awaitingAcknowledgement ? (
                  <AcceptAssignmentDialog
                    assetName={formatAssetName(
                      asset.brandName,
                      asset.modelName
                    )}
                    assetTag={asset.assetTag}
                    condition="Unknown"
                    assignedBy={asset.assignedByName ?? 'IT'}
                    date={formatDay(asset.assignedDate)}
                    isOpen={
                      selected?.assignmentId === asset.assignmentId &&
                      isAcceptOpen
                    }
                    onOpenChange={(open: boolean) => {
                      if (open) {
                        setSelected(asset);
                        setIsAcceptOpen(true);
                      } else {
                        setIsAcceptOpen(false);
                        setSelected(null);
                      }
                    }}
                    onConfirm={handleConfirmAccept}
                    onReportIssue={() => {
                      setSelected(asset);
                      setIsRejectOpen(true);
                    }}
                  />
                ) : null
              }
            />
          );
        })}
      </div>

      <RejectionDialog
        isOpen={isRejectOpen}
        assignment={selected ? toPendingItem(selected) : null}
        onOpenChange={(open: boolean) => {
          if (!open) setSelected(null);
          setIsRejectOpen(open);
        }}
        onSuccess={() => {
          setIsRejectOpen(false);
          setSelected(null);
          router.refresh();
        }}
      />
    </>
  );
}
