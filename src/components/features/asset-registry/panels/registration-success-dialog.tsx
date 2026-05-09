import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { PhysicalTag } from '@/components/features/asset-registry/tags/physical-tag';
import { PrintConfigurationModal } from '@/components/features/asset-registry/tags/print-configuration-modal';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { pdf } from '@react-pdf/renderer';
import TagPdfDocument from '@/components/features/asset-registry/tags/tag-pdf-document';
import { tiqriToast } from '@/components/shared/sonner';

export interface RegistrationSuccessDialogProps {
    isOpen: boolean;
    assetId: string | null;
    modelName: string;
    onOpenChange: (open: boolean) => void;
}

export function RegistrationSuccessDialog({
    isOpen,
    assetId,
    modelName,
    onOpenChange,
}: RegistrationSuccessDialogProps) {
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    const handleGeneratePdf = async (format: 'a4' | 'thermal') => {
        if (!assetId) return;

        try {
            const originUrl = window.location.origin;

            const blob = await pdf(
                <TagPdfDocument
                    assetIds={[assetId]}
                    format={format}
                    originUrl={originUrl}
                    modelNames={{ [assetId]: modelName }}
                />
            ).toBlob();

            const blobUrl = URL.createObjectURL(blob);
            const printWindow = window.open(blobUrl, '_blank');

            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            } else {
                tiqriToast.error('Popup blocker prevented opening the print window.');
            }
        } catch {
            tiqriToast.error('Failed to generate PDF for printing.');
        }
    };

    const handleOpenChange = (open: boolean) => {
        // When the dialog is dismissed by the user, notify the parent so it
        // can clear any local state (e.g., the createdAssetId). The parent
        // will choose not to re-open the slide panel.
        onOpenChange(open);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-115">
                    <DialogHeader>
                        <DialogTitle>Asset Registered Successfully</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 space-y-6">
                        <div className="relative">
                            {assetId && (
                                <PhysicalTag assetId={assetId} modelName={modelName} />
                            )}
                        </div>

                        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-center text-muted-foreground`}>
                            Asset has been recorded. You can print the hardware tag now or do it later from the registry.
                        </p>

                        <Button
                            className="w-full gap-2 bg-[#0a1445] hover:bg-[#0a1445]/90 text-white"
                            onClick={() => setIsPrintModalOpen(true)}
                        >
                            <Printer className="h-4 w-4" />
                            Print Hardware Tag
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <PrintConfigurationModal
                isOpen={isPrintModalOpen}
                onOpenChange={setIsPrintModalOpen}
                selectedCount={1}
                onGenerate={handleGeneratePdf}
            />
        </>
    );
}