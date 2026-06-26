import { LoadingSpinner } from '@/components/shared/loading-spinner';
import React, { useState, useRef } from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
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
      
      if (result.success || result.summary) {
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
      <div className="flex flex-col flex-1 px-8 py-6 gap-6">
        
        {/* Template Download Card */}
        <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Download the template for</p>
              <p className="text-sm font-semibold">{state.categoryName}</p>
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
                <LoadingSpinner size="sm" />
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
            'flex flex-col flex-1 items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer min-h-40',
            isDragOver 
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
              : state.file 
                ? 'border-border bg-muted/30 border-solid cursor-default'
                : 'border-border bg-muted/10 hover:bg-muted/30'
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
              <FileSpreadsheet className="size-10 text-primary mb-3" />
              <p className="text-sm font-semibold max-w-50 truncate">
                {state.file.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{formatFileSize(state.file.size)}</p>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'SET_FILE', file: null });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={state.isValidating}
              >
                <X className="mr-2 size-4" />
                Remove File
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-background shadow-sm border mb-4 text-muted-foreground">
                <Upload className="size-5" />
              </div>
              <p className="text-sm text-foreground">
                Drag & drop your file here, or <span className="font-semibold text-primary">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
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

      <DialogFooter className="px-8 py-5 border-t border-border mt-auto bg-muted/20">
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
        >
          {state.isValidating ? (
            <>
              <LoadingSpinner size="sm" />
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
