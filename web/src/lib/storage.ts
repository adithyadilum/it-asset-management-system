import { put } from '@vercel/blob';

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
