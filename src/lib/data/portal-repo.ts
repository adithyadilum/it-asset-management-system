import { and, desc, eq, gte, lte, isNull, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { assetAssignments, assets, models, categories } from '@/db/schema';

export interface PendingAcceptanceItem {
  assignmentId: number;
  assetId: string;
  assetTag: string;
  modelName: string;
  category: string;
  assignedDate: string;
  assignedById: string;
}

export interface UpcomingReturnItem {
  assignmentId: number;
  assetId: string;
  assetTag: string;
  expectedReturnDate: string | null;
  modelName: string;
}

export interface ReturnRequestedItem {
  assignmentId: number;
  assetId: string;
  assetTag: string;
  returnRequestedAt: string | null;
  modelName: string;
}

export interface PortalAlerts {
  pendingAcceptance: PendingAcceptanceItem[];
  upcomingReturns: UpcomingReturnItem[];
  returnRequested: ReturnRequestedItem[];
}

export async function getPendingAcceptanceAssignments(
  userId: string
): Promise<PendingAcceptanceItem[]> {
  const rows = await db
    .select({
      assignmentId: assetAssignments.id,
      assetId: assets.id,
      assetTag: assets.assetTag,
      modelName: models.name,
      category: categories.name,
      assignedDate: assetAssignments.assignedDate,
      assignedById: assetAssignments.assignedById,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .where(
      and(
        eq(assetAssignments.assignedToUserId, userId),
        eq(assetAssignments.state, 'pending approval'),
        isNull(assetAssignments.returnedDate)
      )
    )
    .orderBy(desc(assetAssignments.assignedDate));

  return rows.map((r) => ({
    ...r,
    assignedDate: r.assignedDate.toISOString(),
  }));
}

export async function getUpcomingReturnAssignments(
  userId: string
): Promise<UpcomingReturnItem[]> {
  // expected_return_date within 14 days
  const now = new Date();
  const in14 = new Date(now);
  in14.setDate(now.getDate() + 14);

  const rows = await db
    .select({
      assignmentId: assetAssignments.id,
      assetId: assets.id,
      assetTag: assets.assetTag,
      expectedReturnDate: assetAssignments.expectedReturnDate,
      modelName: models.name,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .where(
      and(
        eq(assetAssignments.assignedToUserId, userId),
        isNull(assetAssignments.returnedDate),
        gte(assetAssignments.expectedReturnDate, now.toISOString()),
        lte(assetAssignments.expectedReturnDate, in14.toISOString())
      )
    )
    .orderBy(desc(assetAssignments.expectedReturnDate));

  return rows.map((r) => ({
    ...r,
    expectedReturnDate: r.expectedReturnDate
      ? new Date(r.expectedReturnDate).toISOString()
      : null,
  }));
}

export async function getReturnRequestedAssignments(
  userId: string
): Promise<ReturnRequestedItem[]> {
  const rows = await db
    .select({
      assignmentId: assetAssignments.id,
      assetId: assets.id,
      assetTag: assets.assetTag,
      returnRequestedAt: assetAssignments.returnRequestedAt,
      modelName: models.name,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .where(
      and(
        eq(assetAssignments.assignedToUserId, userId),
        isNull(assetAssignments.returnedDate),
        isNotNull(assetAssignments.returnRequestedAt),
        eq(assetAssignments.state, 'requested')
      )
    )
    .orderBy(desc(assetAssignments.returnRequestedAt));

  return rows.map((r) => ({
    ...r,
    returnRequestedAt: r.returnRequestedAt
      ? new Date(r.returnRequestedAt).toISOString()
      : null,
  }));
}

export async function getPortalAlerts(userId: string): Promise<PortalAlerts> {
  const [pending, upcoming, requested] = await Promise.all([
    getPendingAcceptanceAssignments(userId),
    getUpcomingReturnAssignments(userId),
    getReturnRequestedAssignments(userId),
  ]);

  return {
    pendingAcceptance: pending,
    upcomingReturns: upcoming,
    returnRequested: requested,
  };
}

export const portalRepo = {
  getPendingAcceptanceAssignments,
  getUpcomingReturnAssignments,
  getReturnRequestedAssignments,
  getPortalAlerts,
};
