'use client';

import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhysicalTag } from '@/components/features/asset-registry/tags/physical-tag';
import { PrintConfigurationModal } from '@/components/features/asset-registry/tags/print-configuration-modal';
import { pdf } from '@react-pdf/renderer';
import TagPdfDocument from '@/components/features/asset-registry/tags/tag-pdf-document';
import { tiqriToast } from '@/components/shared/sonner';

export interface AssetTagDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    assetId: string;
    modelName?: string;
}

export function AssetTagDialog({
    isOpen,
    onOpenChange,
    assetId,
    modelName,
}: AssetTagDialogProps) {
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    const handleGeneratePdf = async (format: 'a4' | 'thermal') => {
        try {
            const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tiqri.com';

            const blob = await pdf(
                <TagPdfDocument
                    assetIds={[assetId]}
                    format={format}
                    originUrl={originUrl}
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

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle>Asset Tag</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 space-y-6">
                        <div className="scale-90 transform origin-center">
                            <PhysicalTag assetId={assetId} modelName={modelName} />
                        </div>

                        <Button
                            className="w-full gap-2 bg-[#0a1445] hover:bg-[#0a1445]/90 text-white"
                            onClick={() => setIsPrintModalOpen(true)}
                        >
                            <Printer className="h-4 w-4" />
                            Print Asset Tag
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
