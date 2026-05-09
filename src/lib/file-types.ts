export const IMAGE_FILE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.svg',
  '.avif',
] as const;

export const IMAGE_FILE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/avif',
] as const;

export const DOCUMENT_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.rtf',
] as const;

export const DOCUMENT_FILE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/rtf',
] as const;

export const MODEL_IMAGE_ACCEPT = [
  ...IMAGE_FILE_MIME_TYPES,
  ...IMAGE_FILE_EXTENSIONS,
].join(',');

export const INVOICE_ATTACHMENT_ACCEPT = [
  ...DOCUMENT_FILE_MIME_TYPES,
  ...IMAGE_FILE_MIME_TYPES,
  ...DOCUMENT_FILE_EXTENSIONS,
  ...IMAGE_FILE_EXTENSIONS,
].join(',');

function getLowercaseExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) {
    return '';
  }

  return fileName.slice(dotIndex).toLowerCase();
}

export function isModelImageFile(file: File) {
  const mimeType = file.type.toLowerCase();
  const extension = getLowercaseExtension(file.name);

  return (
    IMAGE_FILE_MIME_TYPES.includes(
      mimeType as (typeof IMAGE_FILE_MIME_TYPES)[number]
    ) ||
    IMAGE_FILE_EXTENSIONS.includes(
      extension as (typeof IMAGE_FILE_EXTENSIONS)[number]
    )
  );
}

export function isInvoiceAttachmentFile(file: File) {
  const mimeType = file.type.toLowerCase();
  const extension = getLowercaseExtension(file.name);

  return (
    isModelImageFile(file) ||
    DOCUMENT_FILE_MIME_TYPES.includes(
      mimeType as (typeof DOCUMENT_FILE_MIME_TYPES)[number]
    ) ||
    DOCUMENT_FILE_EXTENSIONS.includes(
      extension as (typeof DOCUMENT_FILE_EXTENSIONS)[number]
    )
  );
}
