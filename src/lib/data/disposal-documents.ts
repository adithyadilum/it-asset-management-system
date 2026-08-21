import { and, eq } from 'drizzle-orm';

import { assetDisposals, assetDocuments } from '@/db/schema';

/**
 * Join condition for the certificates belonging to one disposal record.
 *
 * Shared because the disposal-history query exists twice — once in
 * `src/actions/disposals/history.ts` and again, near-identically, inline in the
 * disposals page. The two had already drifted, and the previous version of this
 * join matched on `assetId` alone: an asset disposed more than once (rejected,
 * re-requested, completed) showed every receipt it had ever accumulated on
 * every one of its disposal rows.
 *
 * A plain module rather than an export from the action file, because
 * `'use server'` permits only async exports.
 */
export const disposalDocumentJoin = and(
  eq(assetDocuments.disposalId, assetDisposals.id),
  eq(assetDocuments.documentType, 'disposal-certificate')
);
