'use client';

import React, { useCallback, useState, useTransition } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface FileUploadZoneProps {
  /** Callback fired when the upload action returns success */
  onUploadSuccess: (url: string) => void;
  /** Callback fired on validation or upload failure */
  onUploadError: (error: string) => void;
  /** The server action or API call to handle the actual upload */
  uploadAction: (formData: FormData) => Promise<{ success: boolean; fileUrl?: string }>;
  /** Accepted file types (react-dropzone format) */
  accept?: Record<string, string[]>;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Custom instructional text for the dropzone */
  label?: string;
  /** Custom sub-text for constraints (e.g., "Supports PDF up to 5MB") */
  subLabel?: string;
}

export function FileUploadZone({ 
  onUploadSuccess, 
  onUploadError, 
  uploadAction,
  accept = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
  },
  maxSize = 5 * 1024 * 1024, // Default 5MB
  label = "Drag & drop your file here, or click to browse",
  subLabel = "Supports .PDF, .JPG, .PNG up to 5MB"
}: FileUploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, startUpload] = useTransition();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    // Handle validation errors (wrong file type, too large, etc.)
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      onUploadError(error.message);
      return;
    }

    // Handle valid file selection
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      onUploadError(''); // Clear any previous errors
    }
  }, [onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize,
    accept,
  });

  const handleUpload = () => {
    if (!file) return;

    startUpload(async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        // Call the injected server action
        const response = await uploadAction(formData);
        
        if (response.success && response.fileUrl) {
          onUploadSuccess(response.fileUrl);
        } else {
          onUploadError('Upload failed to return a valid file URL.');
        }
      } catch (error) {
        onUploadError(error instanceof Error ? error.message : 'Upload failed due to an unknown error.');
      }
    });
  };

  const removeFile = () => {
    setFile(null);
    onUploadError(''); // Clear errors if the user cancels the bad upload
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {!file ? (
        <div
          {...getRootProps()}
          className={`relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all duration-200 ${
            isDragActive 
              ? 'border-primary bg-primary/5 shadow-sm' 
              : 'border-border bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/30'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`mb-3 h-8 w-8 transition-colors ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-sm font-medium text-foreground text-center">
            {label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            {subLabel}
          </p>
        </div>
      ) : (
        <div className="flex w-full items-center justify-between rounded-md border border-border bg-background p-3 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 overflow-hidden pr-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-foreground">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>
          
          <div className="flex shrink-0 items-center gap-2">
            {!isUploading && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={removeFile} 
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              type="button"
              onClick={handleUpload} 
              disabled={isUploading}
              size="sm"
              className="min-w-[80px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}