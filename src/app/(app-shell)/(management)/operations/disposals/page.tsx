import { cookies } from 'next/headers';
import { requirePageAuth } from '@/lib/auth/page-guard';
import { db } from '@/db';
import {
  assetDisposals,
  assets,
  users,
  models,
  categories,
  assetDocuments,
} from '@/db/schema';
import { eq, desc, inArray, and, sql, or, ilike } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DisposalsLayout } from '@/components/features/disposals/disposals-layout';

export const metadata = {
  title: 'Disposals | Operations | TIQRI',
};

interface DisposalsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DisposalsPage({
  searchParams,
}: DisposalsPageProps) {
  const user = await requirePageAuth(
    (role) => role === 'GlobalAdmin' || role === 'FinancialAuditor'
  );

  const cookieStore = await cookies();
  const preferredCurrency =
    cookieStore.get('preferred_currency')?.value || 'LKR';

  // Aliases for users table since we join it twice for requester and approver
  const requester = alias(users, 'requester');
  const approver = alias(users, 'approver');

  // Parse search params for server-side pagination and search
  const resolvedSearchParams = await searchParams;
  const searchQuery =
    typeof resolvedSearchParams?.search === 'string'
      ? resolvedSearchParams.search
      : '';
  const page =
    typeof resolvedSearchParams?.page === 'string'
      ? parseInt(resolvedSearchParams.page, 10)
      : 1;
  const pageSize =
    typeof resolvedSearchParams?.pageSize === 'string'
      ? parseInt(resolvedSearchParams.pageSize, 10)
      : 10;

  const validPage = isNaN(page) || page < 1 ? 1 : page;
  const validPageSize = isNaN(pageSize) || pageSize < 1 ? 10 : pageSize;

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

  // Base condition for disposal history
  const searchCondition = searchQuery
    ? or(
        ilike(assets.assetTag, `%${searchQuery}%`),
        ilike(categories.name, `%${searchQuery}%`),
        ilike(assetDisposals.reason, `%${searchQuery}%`),
        ilike(requester.name, `%${searchQuery}%`),
        ilike(approver.name, `%${searchQuery}%`)
      )
    : undefined;

  const historyBaseCondition = and(
    inArray(assetDisposals.status, ['Completed', 'Rejected']),
    searchCondition
  );

  // 2. Fetch disposal history count for pagination
  const [countResult] = await db
    .select({
      count: sql<number>`cast(count(DISTINCT ${assetDisposals.id}) as int)`,
    })
    .from(assetDisposals)
    .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .innerJoin(requester, eq(assetDisposals.requestedById, requester.id))
    .leftJoin(approver, eq(assetDisposals.approvedById, approver.id))
    .where(historyBaseCondition);

  const totalRecords = countResult?.count || 0;
  const pageCount = Math.max(Math.ceil(totalRecords / validPageSize), 1);

  // 3. Fetch disposal history paginated data
  const historyDataRaw = await db
    .select({
      id: assetDisposals.id,
      assetId: assets.id,
      assetTag: assets.assetTag,
      category: categories.name,
      reason: assetDisposals.reason,
      flaggedBy: requester.name,
      disposedBy: approver.name,
      disposalDate: assetDisposals.resolvedAt,
      status: assetDisposals.status,
      // Group document URLs into an array to handle multiple uploads per disposal
      documentUrls: sql<
        string[]
      >`COALESCE(array_agg(DISTINCT ${assetDocuments.fileUrl}) FILTER (WHERE ${assetDocuments.fileUrl} IS NOT NULL), '{}')`,
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
    .where(historyBaseCondition)
    .groupBy(
      assetDisposals.id,
      assets.id,
      assets.assetTag,
      categories.name,
      assetDisposals.reason,
      requester.name,
      approver.name,
      assetDisposals.resolvedAt,
      assetDisposals.status
    )
    .orderBy(desc(assetDisposals.resolvedAt))
    .limit(validPageSize)
    .offset((validPage - 1) * validPageSize);

  // Format the history data to match the expected props
  const historyData = historyDataRaw.map((row) => ({
    ...row,
    flaggedBy: row.flaggedBy || 'Unknown',
  }));

  return (
    <DisposalsLayout
      pendingData={pendingData}
      historyData={historyData}
      historyPageCount={pageCount}
      historyCurrentPage={validPage}
      historyPageSize={validPageSize}
      historySearchQuery={searchQuery}
      userRole={user.role}
      preferredCurrency={preferredCurrency}
    />
  );
}
