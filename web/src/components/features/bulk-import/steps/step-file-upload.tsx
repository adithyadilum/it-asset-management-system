import React, { useState, useRef } from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Upload, X, Loader2 } from 'lucide-react';
import { generateImportTemplate } from '@/actions/bulk-import';
import { parseAndValidateImport } from '@/actions/bulk-import';
import { tiqriToast } from '@/components/shared/sonner';
import { cn } from '@/lib/utils';
import type { WizardState, WizardAction } from '../use-bulk-import-reducer';

interface StepFileUploadProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function StepFileUpload({ state, dispatch }: StepFileUploadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    if (!state.categoryId) return;
    setIsDownloading(true);
    try {
      const response = await generateImportTemplate(state.categoryId);
      if (!response.success || !response.fileBase64) {
        throw new Error(response.message || 'Failed to generate template');
      }

      // Convert base64 back to Blob and download
      const binaryString = window.atob(response.fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.fileName || 'template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      tiqriToast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Template download error:', error);
      tiqriToast.error('Failed to download template. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    
    // Check file type
    const isValidType = file.name.endsWith('.csv') || file.name.endsWith('.xlsx');
    if (!isValidType) {
      tiqriToast.warning('Invalid file type. Please upload a .csv or .xlsx file.');
      return;
    }
    
    // Check file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      tiqriToast.warning('File is too large. Maximum size is 10MB.');
      return;
    }

    dispatch({ type: 'SET_FILE', file });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleValidate = async () => {
    if (!state.file || !state.categoryId) return;
    
    dispatch({ type: 'START_VALIDATION' });
    
    try {
      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('categoryId', state.categoryId.toString());
      
      const result = await parseAndValidateImport(formData);
      
      if (result.success) {
        dispatch({ type: 'VALIDATION_COMPLETE', result: result });
      } else {
        throw new Error(result.message || 'Validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      tiqriToast.error(error instanceof Error ? error.message : 'Failed to validate file');
      dispatch({ type: 'VALIDATION_FAILED' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-6">
        
        {/* Template Download Card */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Download the template for</p>
              <p className="text-sm font-semibold text-slate-900">{state.categoryName}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={isDownloading || state.isValidating}
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Download Template'
            )}
          </Button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          className={cn(
            'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer',
            isDragOver 
              ? 'border-[#00145a] bg-blue-50/60 ring-2 ring-[#00145a]/20' 
              : state.file 
                ? 'border-slate-200 bg-slate-50 border-solid cursor-default'
                : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !state.file && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (!state.file && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          tabIndex={!state.file ? 0 : -1}
          role="button"
          aria-label="Upload file"
        >
          {state.file ? (
            <div className="flex flex-col items-center text-center w-full">
              <FileSpreadsheet className="h-10 w-10 text-[#00145a] mb-3" />
              <p className="text-sm font-semibold text-slate-900 max-w-[200px] truncate">
                {state.file.name}
              </p>
              <p className="text-xs text-slate-500 mt-1">{formatFileSize(state.file.size)}</p>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-4 text-slate-500 hover:text-red-600 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'SET_FILE', file: null });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={state.isValidating}
              >
                <X className="h-4 w-4 mr-2" />
                Remove File
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 mb-4">
                <Upload className="h-5 w-5 text-slate-500" />
              </div>
              <p className="text-sm text-slate-700">
                Drag & drop your file here, or <span className="font-semibold text-[#00145a]">click to browse</span>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Supports .csv and .xlsx files up to 10MB
              </p>
            </div>
          )}
          <input
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      <DialogFooter className="px-6 py-4 border-t border-slate-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => dispatch({ type: 'RESET' })} // Takes them back to Step 1 essentially via RESET
          disabled={state.isValidating}
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleValidate}
          disabled={!state.file || state.isValidating}
          className="bg-[#00145a] hover:bg-[#00145a]/90 text-white min-w-[100px]"
        >
          {state.isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            'Validate'
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
