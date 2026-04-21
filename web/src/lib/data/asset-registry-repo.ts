import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  assetAssignments,
  assets,
  categories,
  locations,
  models,
  systemAuditLogs,
  users,
} from '@/db/schema';

export type RegistryPillar = typeof categories.$inferSelect.pillar;
export type AssetStatus = typeof assets.$inferSelect.status;
export type AssetCondition = typeof assets.$inferSelect.condition;

export interface AssetRegistryFilters {
  pillar: RegistryPillar;
  query?: string;
  categoryId?: number;
  status?: AssetStatus;
  page?: number;
  pageSize?: number;
}

export interface AssetRegistryRow {
  id: string;
  assetTag: string;
  name: string | null;
  serialNumber: string | null;
  status: AssetStatus;
  condition: AssetCondition | null;
  categoryId: number;
  category: string;
  pillar: RegistryPillar;
  model: string;
  locationId: number | null;
  location: string | null;
  assignedTo: string | null;
  updatedAt: Date;
}

export interface PaginatedAssetsResult {
  data: AssetRegistryRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CategoryOption {
  id: number;
  name: string;
  prefix: string;
  pillar: RegistryPillar;
}

export interface BulkAssetUpdatePayload {
  status?: AssetStatus;
  locationId?: number | null;
  condition?: AssetCondition | null;
}

export interface BulkUpdateAssetsParams {
  assetIds: string[];
  updates: BulkAssetUpdatePayload;
  performedById: string;
  actionType: string;
}

export interface BulkUpdateAssetsResult {
  requestedCount: number;
  updatedCount: number;
  skippedCount: number;
}

function normalizeAssetIds(assetIds: string[]) {
  return [...new Set(assetIds.map((assetId) => assetId.trim()).filter(Boolean))];
}

export async function getCategoriesByPillar(
  pillar: RegistryPillar
): Promise<CategoryOption[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      prefix: categories.prefix,
      pillar: categories.pillar,
    })
    .from(categories)
    .where(and(eq(categories.pillar, pillar), eq(categories.isActive, true)))
    .orderBy(asc(categories.name));
}

export async function getAssetsByPillar(
  filters: AssetRegistryFilters
): Promise<PaginatedAssetsResult> {
  const safePage =
    typeof filters.page === 'number' && filters.page > 0
      ? Math.floor(filters.page)
      : 1;
  const safePageSize =
    typeof filters.pageSize === 'number' && filters.pageSize > 0
      ? Math.floor(filters.pageSize)
      : 16;
  const normalizedQuery = filters.query?.trim();
  const offset = (safePage - 1) * safePageSize;

  const whereCondition = and(
    eq(categories.pillar, filters.pillar),
    eq(categories.isActive, true),
    typeof filters.categoryId === 'number'
      ? eq(categories.id, filters.categoryId)
      : undefined,
    filters.status ? eq(assets.status, filters.status) : undefined,
    normalizedQuery
      ? or(
          ilike(assets.assetTag, `%${normalizedQuery}%`),
          ilike(assets.name, `%${normalizedQuery}%`),
          ilike(assets.serialNumber, `%${normalizedQuery}%`),
          ilike(categories.name, `%${normalizedQuery}%`),
          ilike(models.name, `%${normalizedQuery}%`),
          ilike(locations.name, `%${normalizedQuery}%`)
        )
      : undefined
  );

  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .where(whereCondition);

  const total = totalRows[0]?.total ?? 0;

  const rows = await db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      name: assets.name,
      serialNumber: assets.serialNumber,
      status: assets.status,
      condition: assets.condition,
      categoryId: categories.id,
      category: categories.name,
      pillar: categories.pillar,
      model: models.name,
      locationId: assets.locationId,
      location: locations.name,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .where(whereCondition)
    .orderBy(desc(assets.updatedAt), asc(assets.assetTag))
    .limit(safePageSize)
    .offset(offset);

  const assetIds = rows.map((row) => row.id);

  const assignedUserByAssetId = new Map<string, string>();
  if (assetIds.length > 0) {
    const activeAssignments = await db
      .select({
        assetId: assetAssignments.assetId,
        assignedTo: users.name,
      })
      .from(assetAssignments)
      .leftJoin(users, eq(assetAssignments.assignedToUserId, users.id))
      .where(
        and(
          inArray(assetAssignments.assetId, assetIds),
          isNull(assetAssignments.returnedDate)
        )
      )
      .orderBy(desc(assetAssignments.assignedDate));

    for (const activeAssignment of activeAssignments) {
      if (
        !assignedUserByAssetId.has(activeAssignment.assetId) &&
        activeAssignment.assignedTo
      ) {
        assignedUserByAssetId.set(
          activeAssignment.assetId,
          activeAssignment.assignedTo
        );
      }
    }
  }

  const data: AssetRegistryRow[] = rows.map((row) => ({
    ...row,
    assignedTo: assignedUserByAssetId.get(row.id) ?? null,
  }));

  return {
    data,
    meta: {
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    },
  };
}

export async function bulkUpdateAssets({
  assetIds,
  updates,
  performedById,
  actionType,
}: BulkUpdateAssetsParams): Promise<BulkUpdateAssetsResult> {
  const normalizedAssetIds = normalizeAssetIds(assetIds);

  const hasUpdateFields =
    updates.status !== undefined ||
    Object.prototype.hasOwnProperty.call(updates, 'locationId') ||
    Object.prototype.hasOwnProperty.call(updates, 'condition');

  if (!hasUpdateFields) {
    throw new Error('No valid fields provided for bulk update.');
  }

  const updateSet: {
    status?: AssetStatus;
    locationId?: number | null;
    condition?: AssetCondition | null;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (updates.status !== undefined) {
    updateSet.status = updates.status;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'locationId')) {
    updateSet.locationId = updates.locationId ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'condition')) {
    updateSet.condition = updates.condition ?? null;
  }

  return db.transaction(async (tx) => {
    const existingAssets = await tx
      .select({
        id: assets.id,
        status: assets.status,
        locationId: assets.locationId,
        condition: assets.condition,
        updatedAt: assets.updatedAt,
      })
      .from(assets)
      .where(inArray(assets.id, normalizedAssetIds));

    if (existingAssets.length === 0) {
      return {
        requestedCount: normalizedAssetIds.length,
        updatedCount: 0,
        skippedCount: normalizedAssetIds.length,
      };
    }

    const existingAssetIds = existingAssets.map((existingAsset) => existingAsset.id);

    const updatedAssets = await tx
      .update(assets)
      .set(updateSet)
      .where(inArray(assets.id, existingAssetIds))
      .returning({
        id: assets.id,
        status: assets.status,
        locationId: assets.locationId,
        condition: assets.condition,
        updatedAt: assets.updatedAt,
      });

    if (updatedAssets.length > 0) {
      const previousAssetById = new Map(
        existingAssets.map((existingAsset) => [existingAsset.id, existingAsset])
      );

      await tx.insert(systemAuditLogs).values(
        updatedAssets.map((updatedAsset) => ({
          entityType: 'Asset',
          entityId: updatedAsset.id,
          actionType,
          performedById,
          oldValue: previousAssetById.get(updatedAsset.id) ?? null,
          newValue: updatedAsset,
        }))
      );
    }

    return {
      requestedCount: normalizedAssetIds.length,
      updatedCount: updatedAssets.length,
      skippedCount: Math.max(0, normalizedAssetIds.length - updatedAssets.length),
    };
  });
}
