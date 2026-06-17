'use server';

import { and, desc, eq, inArray, or, ilike, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import {
  assetDisposals,
  assets,
  users,
  models,
  categories,
  assetDocuments,
} from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { assertAllowed } from '@/actions/disposals/utils';

export async function getDisposalHistory(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('UNAUTHENTICATED');
  assertAllowed(user.role, ['GlobalAdmin', 'FinanceAuditor']);

  const searchQuery = params.search || '';
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10;

  try {
    const dbTimer = startLatencyTimer();

    // Aliases for users table
    const requester = alias(users, 'requester');
    const approver = alias(users, 'approver');

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

    // 1. Fetch disposal history count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`cast(count(DISTINCT ${assetDisposals.id}) as int)` })
      .from(assetDisposals)
      .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .innerJoin(requester, eq(assetDisposals.requestedById, requester.id))
      .leftJoin(approver, eq(assetDisposals.approvedById, approver.id))
      .where(historyBaseCondition);

    const totalRecords = countResult?.count || 0;
    const pageCount = Math.max(Math.ceil(totalRecords / pageSize), 1);
    const validPage = Math.min(page, pageCount);

    // 2. Fetch disposal history paginated data
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
        documentUrls: sql<string[]>`COALESCE(array_agg(DISTINCT ${assetDocuments.fileUrl}) FILTER (WHERE ${assetDocuments.fileUrl} IS NOT NULL), '{}')`,
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
      .limit(pageSize)
      .offset((validPage - 1) * pageSize);

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.getDisposalHistory',
      startTime: dbTimer,
    });

    const data = historyDataRaw.map(row => ({
      ...row,
      flaggedBy: row.flaggedBy || 'Unknown',
    }));

    return {
      data,
      pagination: {
        page: validPage,
        pageSize,
        pageCount,
        totalRecords,
      },
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'disposals.getDisposalHistory',
      startTime: actionTimer,
    });
  }
}
