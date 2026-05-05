import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useWizardReducer } from './use-bulk-import-reducer';
import { BulkImportStepper } from './bulk-import-stepper';
import { StepCategorySelect } from './steps/step-category-select';
import { StepFileUpload } from './steps/step-file-upload';
import { StepPreview } from './steps/step-preview';
import { StepExecution } from './steps/step-execution';

export interface BulkImportWizardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: number; name: string; pillar: string }[];
}

export function BulkImportWizard({ isOpen, onOpenChange, categories }: BulkImportWizardProps) {
  const [state, dispatch] = useWizardReducer();

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      dispatch({ type: 'RESET' });
    }
  }, [isOpen, dispatch]);

  const handleOpenChange = (open: boolean) => {
    // Prevent closing during execution step
    if (state.step === 4 && state.isExecuting) {
      return;
    }
    onOpenChange(open);
  };

  const getStepTitle = () => {
    switch (state.step) {
      case 1:
        return 'Select Category';
      case 2:
        return 'Upload File';
      case 3:
        return 'Preview Results';
      case 4:
        return 'Importing';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (state.step) {
      case 1:
        return 'Choose the asset category to import into.';
      case 2:
        return 'Download the template and upload your filled file.';
      case 3:
        return 'Review validation summary and inspect errors before importing.';
      case 4:
        return 'Executing import. Please do not close this window.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[680px] p-0 overflow-hidden"
        showCloseButton={!(state.step === 4 && state.isExecuting)}
      >
        <div className="bg-slate-50 pt-4 pb-2 border-b border-slate-200">
          <BulkImportStepper currentStep={state.step} />
          <DialogHeader className="px-6 pb-2">
            <DialogTitle className="text-[18px] font-semibold text-slate-900">
              {getStepTitle()}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {getStepDescription()}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="transition-opacity duration-200 min-h-[300px]">
          {state.step === 1 && (
            <StepCategorySelect categories={categories} state={state} dispatch={dispatch} />
          )}
          {state.step === 2 && (
            <StepFileUpload state={state} dispatch={dispatch} />
          )}
          {state.step === 3 && (
            <StepPreview state={state} dispatch={dispatch} />
          )}
          {state.step === 4 && (
            <StepExecution state={state} dispatch={dispatch} onDone={() => onOpenChange(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
