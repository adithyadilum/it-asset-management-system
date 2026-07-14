import { put } from '@vercel/blob';
import { hasExpectedFileSignature, isInvoiceAttachmentFile, isModelImageFile } from '@/lib/file-types';
import { randomUUID } from 'crypto';
import { serverEnv } from '@/lib/env';

// Define the allowed "folders" so developers don't make typos
type StorageFolder =
  | 'models'
  | 'invoices'
  | 'warranties'
  | 'disposals'
  | 'documents';

export async function uploadFileToStorage(
  file: File,
  folder: StorageFolder
): Promise<string> {
  if (file.size === 0) {
    throw new Error('File is empty');
  }

  // Security Check: Enforce a 4.5MB limit globally
  const MAX_FILE_SIZE = Math.floor(4.5 * 1024 * 1024);
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds the 4.5MB limit.');
  }

  if (folder === 'models' && !isModelImageFile(file)) {
    throw new Error(
      'Model image must be a valid PNG, JPG, JPEG, WEBP, GIF, or AVIF file.'
    );
  }

  if (folder !== 'models' && !isInvoiceAttachmentFile(file)) {
    throw new Error(
      'File must be a supported document or image (PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, RTF, PNG, JPG, JPEG, WEBP, GIF, or AVIF).'
    );
  }

  if (!(await hasExpectedFileSignature(file))) {
    throw new Error('File contents do not match the declared file type.');
  }

  // Sanitize the file name (remove spaces and special characters)
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');

  // Create a unique path: folder/timestamp-filename.ext
  const uniquePath = `${folder}/${randomUUID()}-${sanitizedName || 'upload'}`;

  // Upload to Vercel
  const isPublicModelImage = folder === 'models';
  const privateToken = serverEnv.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!isPublicModelImage && !privateToken) {
    throw new Error('PRIVATE_BLOB_READ_WRITE_TOKEN is required for sensitive uploads.');
  }

  const blob = await put(uniquePath, file, isPublicModelImage
    ? { access: 'public' }
    : { access: 'private', token: privateToken! });

  return isPublicModelImage
    ? blob.url
    : `/api/files?pathname=${encodeURIComponent(blob.pathname)}`;
}
