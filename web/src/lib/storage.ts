import { put } from '@vercel/blob';
import { isInvoiceAttachmentFile, isModelImageFile } from '@/lib/file-types';

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
      'Model image must be a valid image file (PNG, JPG, JPEG, WEBP, GIF, BMP, SVG, or AVIF).'
    );
  }

  if (folder !== 'models' && !isInvoiceAttachmentFile(file)) {
    throw new Error(
      'File must be a supported document or image (PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, RTF, PNG, JPG, JPEG, WEBP, GIF, BMP, SVG, or AVIF).'
    );
  }

  // Sanitize the file name (remove spaces and special characters)
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');

  // Create a unique path: folder/timestamp-filename.ext
  const uniquePath = `${folder}/${Date.now()}-${sanitizedName}`;

  // Upload to Vercel
  const blob = await put(uniquePath, file, {
    access: 'public',
  });

  return blob.url;
}
