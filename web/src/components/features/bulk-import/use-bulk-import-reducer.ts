import { useReducer } from 'react';
import type { BulkImportPreviewResult } from '@/lib/bulk-import/types';

export type WizardStep = 1 | 2 | 3 | 4;

export type WizardState = {
  step: WizardStep;

  // Step 1
  categoryId: number | null;
  categoryName: string;
  pillar: string;

  // Step 2
  file: File | null;
  isValidating: boolean;

  // Step 3
  previewResult: BulkImportPreviewResult | null;

  // Step 4
  isExecuting: boolean;
  executionProgress: number; // 0-100
  executionResult: {
    successCount: number;
    failedCount: number;
    importedAssetTags: string[];
    errorCsvData?: string;
  } | null;
};

export type WizardAction =
  | { type: 'SET_CATEGORY'; categoryId: number; categoryName: string; pillar: string }
  | { type: 'SET_FILE'; file: File }
  | { type: 'START_VALIDATION' }
  | { type: 'VALIDATION_COMPLETE'; result: BulkImportPreviewResult }
  | { type: 'VALIDATION_FAILED' }
  | { type: 'GO_BACK_TO_UPLOAD' }
  | { type: 'START_EXECUTION' }
  | { type: 'UPDATE_PROGRESS'; progress: number }
  | { type: 'EXECUTION_COMPLETE'; result: NonNullable<WizardState['executionResult']> }
  | { type: 'RESET' };

const initialState: WizardState = {
  step: 1,
  categoryId: null,
  categoryName: '',
  pillar: '',
  file: null,
  isValidating: false,
  previewResult: null,
  isExecuting: false,
  executionProgress: 0,
  executionResult: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_CATEGORY':
      return {
        ...state,
        categoryId: action.categoryId,
        categoryName: action.categoryName,
        pillar: action.pillar,
        step: 2,
      };
    case 'SET_FILE':
      return {
        ...state,
        file: action.file,
      };
    case 'START_VALIDATION':
      return {
        ...state,
        isValidating: true,
      };
    case 'VALIDATION_COMPLETE':
      return {
        ...state,
        isValidating: false,
        previewResult: action.result,
        step: 3,
      };
    case 'VALIDATION_FAILED':
      return {
        ...state,
        isValidating: false,
      };
    case 'GO_BACK_TO_UPLOAD':
      return {
        ...state,
        step: 2,
        previewResult: null,
      };
    case 'START_EXECUTION':
      return {
        ...state,
        step: 4,
        isExecuting: true,
        executionProgress: 0,
      };
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        executionProgress: action.progress,
      };
    case 'EXECUTION_COMPLETE':
      return {
        ...state,
        isExecuting: false,
        executionProgress: 100,
        executionResult: action.result,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useWizardReducer() {
  return useReducer(wizardReducer, initialState);
}
