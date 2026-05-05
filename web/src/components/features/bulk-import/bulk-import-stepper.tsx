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
    <div className="flex w-full items-center justify-between px-4 pb-6 pt-2">
      {steps.map((s, index) => {
        const isActive = s.step === currentStep;
        const isCompleted = s.step < currentStep;
        const isFuture = s.step > currentStep;

        return (
          <div key={s.step} className="flex flex-1 items-center" aria-current={isActive ? 'step' : undefined}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
                  isActive && 'bg-[#00145a] text-white ring-4 ring-[#00145a]/10',
                  isCompleted && 'bg-emerald-500 text-white scale-100',
                  isFuture && 'bg-slate-200 text-slate-400'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : s.step}
              </div>
              <span
                className={cn(
                  'text-xs transition-colors duration-300',
                  isActive && 'text-[#00145a] font-semibold',
                  isCompleted && 'text-slate-700 font-medium',
                  isFuture && 'text-slate-400 font-medium'
                )}
              >
                {s.label}
              </span>
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-full flex-1 mx-4 transition-colors duration-300',
                  isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
