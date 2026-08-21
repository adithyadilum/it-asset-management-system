'use client';

import { useState } from 'react';
import { Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhysicalTag } from '@/components/features/asset-registry/tags/physical-tag';
import { PrintConfigurationModal } from '@/components/features/asset-registry/tags/print-configuration-modal';
import { generateAndPrintTagPdf } from '@/lib/utils/tag-print';
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
      await generateAndPrintTagPdf({
        assetIds: [assetId],
        format,
        modelNames: { [assetId]: modelName || 'Standard Model' },
      });
    } catch {
      tiqriToast.error('Failed to generate PDF for printing.');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-115 bg-transparent shadow-none border-none">
          <DialogHeader>
            {/* Visually hidden title and description for accessibility (Screen Readers) */}
            <DialogTitle className="sr-only">Asset Tag Preview</DialogTitle>
            <DialogDescription className="sr-only">
              Preview of the physical asset tag including QR code and corporate
              branding.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            <PhysicalTag assetId={assetId} modelName={modelName} />

            <Button
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
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
