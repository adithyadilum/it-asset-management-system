export const IMAGE_FILE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.avif',
] as const;

export const IMAGE_FILE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
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

export function getLowercaseExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) {
    return '';
  }

  return fileName.slice(dotIndex).toLowerCase();
}

export function isModelImageFile(file: File) {
  const mimeType = file.type.toLowerCase();
  const extension = getLowercaseExtension(file.name);

  const allowedPairs: Record<string, readonly string[]> = {
    '.png': ['image/png'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.webp': ['image/webp'],
    '.gif': ['image/gif'],
    '.avif': ['image/avif'],
  };
  return allowedPairs[extension]?.includes(mimeType) ?? false;
}

export function isInvoiceAttachmentFile(file: File) {
  const mimeType = file.type.toLowerCase();
  const extension = getLowercaseExtension(file.name);

  if (isModelImageFile(file)) return true;

  const allowedPairs: Record<string, readonly string[]> = {
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    '.xls': ['application/vnd.ms-excel'],
    '.xlsx': [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    '.csv': ['text/csv', 'text/plain'],
    '.txt': ['text/plain'],
    '.rtf': ['application/rtf', 'text/rtf'],
  };
  return allowedPairs[extension]?.includes(mimeType) ?? false;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export async function hasExpectedFileSignature(file: File): Promise<boolean> {
  const extension = getLowercaseExtension(file.name);
  const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());

  if (extension === '.png')
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === '.jpg' || extension === '.jpeg')
    return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (extension === '.gif')
    return (
      new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF87a' ||
      new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF89a'
    );
  if (extension === '.webp')
    return (
      new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
    );
  if (extension === '.avif')
    return (
      new TextDecoder().decode(bytes.slice(4, 12)).includes('ftypavif') ||
      new TextDecoder().decode(bytes.slice(4, 12)).includes('ftypavis')
    );
  if (extension === '.pdf')
    return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  if (extension === '.doc' || extension === '.xls')
    return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (extension === '.docx' || extension === '.xlsx')
    return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
  if (extension === '.rtf')
    return (
      new TextDecoder().decode(bytes.slice(0, 5)).toLowerCase() === '{\\rtf'
    );

  if (extension === '.csv' || extension === '.txt') {
    if (bytes.includes(0)) return false;
    const sample = new TextDecoder().decode(bytes).trimStart().toLowerCase();
    return (
      !sample.startsWith('<svg') &&
      !sample.startsWith('<script') &&
      !sample.startsWith('<!doctype html')
    );
  }

  return false;
}
