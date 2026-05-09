import React from 'react';
import { Check } from 'lucide-react';
import type { WizardStep } from './use-bulk-import-reducer';
import { cn } from '@/lib/utils';

interface BulkImportStepperProps {
  currentStep: WizardStep;
}

const steps = [
  { step: 1, label: 'Select' },
  { step: 2, label: 'Upload' },
  { step: 3, label: 'Preview' },
  { step: 4, label: 'Import' },
] as const;

export function BulkImportStepper({ currentStep }: BulkImportStepperProps) {
  return (
    <div className="flex w-full items-start justify-between px-8 pb-4 pt-4">
      {steps.map((s, index) => {
        const isActive = s.step === currentStep;
        const isCompleted = s.step < currentStep;
        const isFuture = s.step > currentStep;

        return (
          <React.Fragment key={s.step}>
            <div className="flex flex-col items-center justify-center gap-2 min-w-15" aria-current={isActive ? 'step' : undefined}>
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  isCompleted && 'bg-primary text-primary-foreground scale-100',
                  isFuture && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="size-4" /> : s.step}
              </div>
              <span
                className={cn(
                  'text-xs transition-colors duration-300 text-center',
                  (isActive || isCompleted) && 'text-foreground font-semibold',
                  isFuture && 'text-muted-foreground font-medium'
                )}
              >
                {s.label}
              </span>
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-full flex-1 mt-4 mx-2 transition-colors duration-300',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
