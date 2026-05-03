import { db } from '@/db';
import { assetDisposals, assets, users, models, categories, assetDocuments } from '@/db/schema';
import { eq, desc, inArray, and, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DisposalsLayout } from '@/components/features/disposals/disposals-layout';

export const metadata = {
  title: 'Disposals | Operations | TIQRI',
};

export default async function DisposalsPage() {
  // Aliases for users table since we join it twice for requester and approver
  const requester = alias(users, 'requester');
  const approver = alias(users, 'approver');

  // 1. Fetch pending requests
  const pendingData = await db
    .select({
      id: assetDisposals.id,
      assetId: assets.id,
      assetTag: assets.assetTag,
      assetName: assets.name,
      flaggedBy: users.name,
      reason: assetDisposals.reason,
      requestedAt: assetDisposals.requestedAt,
    })
    .from(assetDisposals)
    .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
    .innerJoin(users, eq(assetDisposals.requestedById, users.id))
    .where(eq(assetDisposals.status, 'Pending Approval'))
    .orderBy(desc(assetDisposals.requestedAt));

  // 2. Fetch disposal history (Completed or Rejected)
  const historyDataRaw = await db
    .select({
      id: assetDisposals.id,
      assetTag: assets.assetTag,
      category: categories.name,
      reason: assetDisposals.reason,
      flaggedBy: requester.name,
      disposedBy: approver.name,
      disposalDate: assetDisposals.resolvedAt,
      status: assetDisposals.status,
      documentUrl: assetDocuments.fileUrl,
    })
    .from(assetDisposals)
    .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .innerJoin(requester, eq(assetDisposals.requestedById, requester.id))
    .leftJoin(approver, eq(assetDisposals.approvedById, approver.id))
    .leftJoin(
      assetDocuments,
      and(
        eq(assetDocuments.assetId, assets.id),
        eq(assetDocuments.documentType, 'disposal-certificate')
      )
    )
    .where(inArray(assetDisposals.status, ['Completed', 'Rejected']))
    .orderBy(desc(assetDisposals.resolvedAt));
    
  // Format the history data to match the expected props (ensuring nullable string handling)
  const historyData = historyDataRaw.map(row => ({
    ...row,
    flaggedBy: row.flaggedBy || 'Unknown',
  }));

  return (
    <DisposalsLayout pendingData={pendingData} historyData={historyData} />
  );
}