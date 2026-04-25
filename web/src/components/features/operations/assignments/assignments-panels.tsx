"use client";

import { AssetAssignmentDetailsPanel } from "@/components/features/asset-registry/panels/asset-assignment-panel";

type AssignmentPanelAsset = {
  assetId: string;
  assetTag: string;
  category: string;
  model: string;
  brand: string;
  serialNumber: string;
  owner: string;
  assignedTo: string;
  group: string;
  dateCreated: string;
  updatedAt: string;
  warranty: string;
  note: string;
  status: string;
};

interface AssignmentsPanelsProps {
  isOpen: boolean;
  selectedAsset: AssignmentPanelAsset | null;
  onClose: () => void;
}

export function AssignmentsPanels({ isOpen, selectedAsset, onClose }: AssignmentsPanelsProps) {
  return (
    <AssetAssignmentDetailsPanel
      isOpen={isOpen}
      onClose={onClose}
      isLoading={false}
      assetId={selectedAsset?.assetId ?? ""}
      assetTag={selectedAsset?.assetTag ?? "QR Code"}
      category={selectedAsset?.category ?? ""}
      model={selectedAsset?.model ?? ""}
      brand={selectedAsset?.brand ?? ""}
      serialNumber={selectedAsset?.serialNumber ?? ""}
      owner={selectedAsset?.owner ?? ""}
      assignedTo={selectedAsset?.assignedTo ?? ""}
      group={selectedAsset?.group ?? ""}
      dateCreated={selectedAsset?.dateCreated ?? ""}
      updatedAt={selectedAsset?.updatedAt ?? ""}
      warranty={selectedAsset?.warranty ?? ""}
      lastRepaired="08/10/2025"
      note={selectedAsset?.note ?? ""}
      status={selectedAsset?.status ?? "Available"}
      maintenanceEvents={[]}
      onEdit={() => {}}
      onAssign={() => {}}
    />
  );
}
