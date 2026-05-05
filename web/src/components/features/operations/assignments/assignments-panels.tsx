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
	department?: string;
	group: string;
	dateCreated: string;
	assignedDate?: string;
	expectedReturnDate?: string;
	updatedAt: string;
	warranty: string;
	lastRepaired?: string;
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

	if (!isOpen || !selectedAsset) {
		return null;
	}

	return (
		<>
			<AssetAssignmentDetailsPanel
				isLoading={false}
				onClose={onClose}
				assetId={selectedAsset?.assetId ?? ""}
				assetTag={selectedAsset?.assetTag ?? "QR Code"}
				category={selectedAsset?.category ?? ""}
				model={selectedAsset?.model ?? ""}
				brand={selectedAsset?.brand ?? ""}
				serialNumber={selectedAsset?.serialNumber ?? ""}
				owner={selectedAsset?.owner ?? ""}
				assignedTo={selectedAsset?.assignedTo ?? ""}
				department={selectedAsset?.department ?? ""}
				assignedDate={selectedAsset?.assignedDate ?? ""}
				expectedReturnDate={selectedAsset?.expectedReturnDate ?? ""}
				group={selectedAsset?.group ?? ""}
				dateCreated={selectedAsset?.dateCreated ?? ""}
				updatedAt={selectedAsset?.updatedAt ?? ""}
				warranty={selectedAsset?.warranty ?? ""}
				lastRepaired={selectedAsset?.lastRepaired ?? ""}
				note={selectedAsset?.note ?? ""}
				status={selectedAsset?.status ?? "Available"}
				maintenanceEvents={[]}
				onEdit={() => {}}
				onAssign={() => setIsAssignmentModalOpen(true)}
			/>

			<AssetAssignmentModal
				isOpen={isAssignmentModalOpen}
				assetId={selectedAsset?.assetId ?? ""}
				assetLabel={assetLabel}
				assetGroup={selectedAsset?.group ?? ""}
				onOpenChange={setIsAssignmentModalOpen}
			/>
		</>
	);
}
