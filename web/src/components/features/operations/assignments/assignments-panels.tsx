"use client";

import { useMemo, useState } from "react";
import { AssetAssignmentDetailsPanel } from "@/components/features/asset-registry/panels/asset-assignment-panel";
import { AssetAssignmentModal } from "./asset-assignment-modal";

type AssignmentPanelAsset = {
	assetId: string;
	assetName?: string;
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
	const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

	const assetLabel = useMemo(() => {
		if (!selectedAsset) {
			return "Selected Asset";
		}

		if (selectedAsset.model && selectedAsset.model.trim().length > 0 && selectedAsset.model !== "-") {
			return selectedAsset.model;
		}

		if (selectedAsset.assetName && selectedAsset.assetName.trim().length > 0) {
			return selectedAsset.assetName;
		}

		return selectedAsset.assetId;
	}, [selectedAsset]);

	return (
		<>
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

				note={selectedAsset?.note ?? ""}
				status={selectedAsset?.status ?? "Available"}
				maintenanceEvents={[]}
				onEdit={() => {}}
				onAssign={() => setIsAssignmentModalOpen(true)}
			/>

			<AssetAssignmentModal
				isOpen={isOpen && isAssignmentModalOpen}
				assetId={selectedAsset?.assetId ?? ""}
				assetLabel={assetLabel}
				assetGroup={selectedAsset?.group ?? ""}
				onOpenChange={setIsAssignmentModalOpen}
			/>
		</>
	);
}
