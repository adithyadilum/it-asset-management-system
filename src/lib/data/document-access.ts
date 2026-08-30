import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { assetDocuments, assetDisposals, assetPurchases } from '@/db/schema';
import type { DocumentKind } from '@/lib/auth/document-policy';

/**
 * A stored document is always referenced by the proxy URL that
 * `uploadFileToStorage` returns, never by the raw blob pathname.
 */
export function toProxyUrl(pathname: string): string {
  return `/api/files?pathname=${encodeURIComponent(pathname)}`;
}

/**
 * Resolves a blob pathname back to the record that references it.
 *
 * Returning `null` means no record in the system points at this blob, which is
 * the check that stops an authenticated caller from streaming arbitrary blobs
 * by guessing or replaying a pathname.
 */
export async function resolveDocumentKind(
  pathname: string
): Promise<DocumentKind | null> {
  const proxyUrl = toProxyUrl(pathname);

  const [invoice, document, legacyReceipt] = await Promise.all([
    db
      .select({ id: assetPurchases.id })
      .from(assetPurchases)
      .where(eq(assetPurchases.invoiceUrl, proxyUrl))
      .limit(1),
    db
      .select({ documentType: assetDocuments.documentType })
      .from(assetDocuments)
      .where(eq(assetDocuments.fileUrl, proxyUrl))
      .limit(1),
    db
      .select({ id: assetDisposals.id })
      .from(assetDisposals)
      .where(eq(assetDisposals.disposalReceiptUrl, proxyUrl))
      .limit(1),
  ]);

  if (invoice.length > 0) return 'invoice';

  if (document.length > 0) {
    return document[0].documentType === 'disposal-certificate'
      ? 'disposal-certificate'
      : 'asset-document';
  }

  // Legacy single-receipt column, kept for rows written before disposal
  // certificates moved into `asset_documents`.
  if (legacyReceipt.length > 0) return 'disposal-certificate';

  return null;
}
