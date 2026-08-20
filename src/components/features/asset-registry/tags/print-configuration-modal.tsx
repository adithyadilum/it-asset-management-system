import { LoadingSpinner } from '@/components/shared/loading-spinner';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PrintConfigurationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onGenerate: (format: 'a4' | 'thermal') => Promise<void>;
}

export function PrintConfigurationModal({
  isOpen,
  onOpenChange,
  selectedCount,
  onGenerate,
}: PrintConfigurationModalProps) {
  const [layout, setLayout] = useState<'a4' | 'thermal'>('thermal');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(layout);
      onOpenChange(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={!isGenerating ? onOpenChange : undefined}
    >
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Generate Asset Tags</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mt-2">
            Your selected asset tags will be printed at standard label size.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted rounded-xl p-5 mt-2">
          <h4 className="text-sm font-medium text-foreground mb-4">
            Confirm Layout for {selectedCount} selected asset
            {selectedCount === 1 ? '' : 's'}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {/* A4 Layout Option */}
            <button
              disabled={isGenerating}
              onClick={() => setLayout('a4')}
              className={cn(
                'flex flex-col items-center justify-center py-6 px-4 rounded-xl transition-all border-2',
                layout === 'a4'
                  ? 'bg-muted/50 border-border'
                  : 'bg-background border-transparent hover:border-border shadow-sm'
              )}
            >
              <div className="bg-background rounded-md p-2 shadow-sm border border-border mb-4 inline-flex">
                {/* Visual preview of A4 3x10 grid layout */}
                <svg
                  width="48"
                  height="72"
                  viewBox="0 0 48 72"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {Array.from({ length: 10 }).map((_, row) =>
                    Array.from({ length: 3 }).map((_, col) => (
                      <rect
                        key={`a4-${row}-${col}`}
                        x={col * 14 + 4}
                        y={row * 6 + 4}
                        width="12"
                        height="4"
                        rx="1"
                        stroke="#94a3b8"
                        strokeWidth="1"
                        fill="white"
                      />
                    ))
                  )}
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-foreground">
                  3 x 10
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  A4 sheet
                </div>
              </div>
            </button>

            {/* Thermal Layout Option */}
            <button
              disabled={isGenerating}
              onClick={() => setLayout('thermal')}
              className={cn(
                'flex flex-col items-center justify-center py-6 px-4 rounded-xl transition-all border-2',
                layout === 'thermal'
                  ? 'bg-muted/50 border-border'
                  : 'bg-background border-transparent hover:border-border shadow-sm'
              )}
            >
              <div className="bg-background rounded-md p-2 shadow-sm border border-border mb-4 inline-flex">
                {/* Visual preview of continuous thermal roll layout */}
                <svg
                  width="32"
                  height="72"
                  viewBox="0 0 32 72"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {Array.from({ length: 12 }).map((_, row) => (
                    <rect
                      key={`thermal-${row}`}
                      x={6}
                      y={row * 5.2 + 4}
                      width="20"
                      height="3.5"
                      rx="1"
                      stroke="#94a3b8"
                      strokeWidth="1"
                      fill="white"
                    />
                  ))}
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-foreground">
                  1 x 12
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Thermal Printer
                </div>
              </div>
            </button>
          </div>
        </div>

        <DialogFooter className="mt-4 sm:space-x-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isGenerating && <LoadingSpinner size="sm" />}
            {isGenerating ? 'Generating PDF...' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
