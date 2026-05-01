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
  uploadAction: (formData: FormData) => Promise<{ success: boolean; fileUrl?: string; url?: string }>;
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
  maxSize = 4.5 * 1024 * 1024, // Updated Default 4.5MB to match your backend
  label = "Drag & drop your files here, or click to browse",
  subLabel = "Supports .PDF, .JPG, .PNG up to 4.5MB"
}: FileUploadZoneProps) {
  // CHANGED: Now tracks an array of files instead of a single file
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, startUpload] = useTransition();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    // Handle validation errors (wrong file type, too large, etc.)
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      onUploadError(error.message);
      return;
    }

    // Handle valid file selection (Append to existing files)
    if (acceptedFiles.length > 0) {
      setFiles((prev) => [...prev, ...acceptedFiles]);
      onUploadError(''); // Clear any previous errors
    }
  }, [onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // CHANGED: Removed maxFiles: 1 so it accepts multiple files by default
    maxSize,
    accept,
  });

  const handleUpload = () => {
    if (files.length === 0) return;

    startUpload(async () => {
      // Loop through all selected files and upload them
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await uploadAction(formData);
          
          // Check for either url or fileUrl based on our backend fix
          const uploadedUrl = response.url || response.fileUrl;
          
          if (response.success && uploadedUrl) {
            onUploadSuccess(uploadedUrl);
          } else {
            onUploadError(`Upload failed for ${file.name}`);
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          onUploadError(`Error uploading ${file.name}: ${msg}`);
        }
      }
      // Clear the staging area once all uploads are complete
      setFiles([]);
    });
  };

  // CHANGED: Requires an index to know which file to remove
  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    onUploadError(''); 
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ALWAYS show the dropzone so users can keep adding more files */}
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

      {/* Render the list of currently selected files waiting to be uploaded */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Ready to Upload ({files.length})
          </span>
          
          {files.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className="flex w-full items-start justify-between rounded-md border border-border bg-background p-3 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3 overflow-hidden pr-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col overflow-hidden pt-0.5">
                  {/* CHANGED: Replaced truncate with break-all so long names wrap correctly */}
                  <span className="break-all text-sm font-medium text-foreground leading-tight">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              
              <div className="flex shrink-0 items-center gap-2">
                {!isUploading && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeFile(idx)} 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button 
            type="button"
            onClick={handleUpload} 
            disabled={isUploading}
            className="w-full mt-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading Files...
              </>
            ) : (
              `Upload ${files.length} File${files.length > 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}