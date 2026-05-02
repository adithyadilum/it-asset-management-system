import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

import { getAssetsByPillar } from '@/actions/asset-registry';
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
import type { AssetRegistryRow, AssetStatus } from '@/lib/data/asset-registry-repo';

export type AssignmentsDashboardTab = 'available' | 'assigned' | 'returned';

export interface AssignmentsDashboardRow {
  id: string;
  assetTag: string;
  name: string | null;
  serialNumber: string | null;
  category: string;
  pillar: string;
  status: AssetStatus | 'Returned';
  location: string | null;
  assignedTo: string | null;
  returnedDate: Date | null;
}

export interface AssignmentsDashboardData {
  available: AssignmentsDashboardRow[];
  assigned: AssignmentsDashboardRow[];
  returned: AssignmentsDashboardRow[];
}

const DASHBOARD_PILLARS: Array<'IT & Digital' | 'Office Furniture' | 'Office Electronics'> = [
  'IT & Digital',
  'Office Furniture',
  'Office Electronics',
];
const BULK_PAGE_SIZE = 100;

export type AssignmentTargetType = 'user' | 'location';

export interface AssignAssetInput {
  assetId: string;
  assignmentType: AssignmentTargetType;
  targetId: string | number;
  expectedReturnDate?: string;
  notes?: string;
}

export interface BulkAssignAssetsInput {
  assetIds: string[];
  assignmentType: AssignmentTargetType;
  targetId: string | number;
  expectedReturnDate?: string;
  notes?: string;
}

export interface AssignmentMutationResult {
  assignedAssetIds: string[];
  assignedCount: number;
}

export class AssignmentServiceError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AssignmentServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function isIsoDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeExpectedReturnDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (!isIsoDateString(trimmedValue)) {
    throw new AssignmentServiceError(
      'Expected return date must be in YYYY-MM-DD format.',
      422,
      'INVALID_EXPECTED_RETURN_DATE'
    );
  }

  return trimmedValue;
}

function normalizeNotes(value?: string): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

async function ensureActiveTargetExists(
  assignmentType: AssignmentTargetType,
  targetId: string | number
) {
  if (assignmentType === 'user') {
    if (typeof targetId !== 'string') {
      throw new AssignmentServiceError(
        'Invalid user target.',
        422,
        'INVALID_TARGET_ID'
      );
    }

    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, targetId), eq(users.isActive, true)))
      .limit(1);

    if (!targetUser) {
      throw new AssignmentServiceError(
        'Target user does not exist or is inactive.',
        422,
        'TARGET_NOT_FOUND'
      );
    }

    return {
      assignedToUserId: targetUser.id,
      assignedToLocationId: null as number | null,
    };
  }

  const normalizedLocationId =
    typeof targetId === 'number' ? targetId : Number(targetId);

  if (!Number.isInteger(normalizedLocationId) || normalizedLocationId <= 0) {
    throw new AssignmentServiceError(
      'Invalid location target.',
      422,
      'INVALID_TARGET_ID'
    );
  }

  const [targetLocation] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.id, normalizedLocationId), eq(locations.isActive, true)))
    .limit(1);

  if (!targetLocation) {
    throw new AssignmentServiceError(
      'Target location does not exist or is inactive.',
      422,
      'TARGET_NOT_FOUND'
    );
  }

  return {
    assignedToUserId: null as string | null,
    assignedToLocationId: targetLocation.id,
  };
}

function dedupeAssetIds(assetIds: string[]) {
  return [...new Set(assetIds.map((id) => id.trim()).filter((id) => id.length > 0))];
}

async function validateAssetsForAssignment(assetIds: string[]) {
  const assetsInDb = await db
    .select({
      id: assets.id,
      status: assets.status,
      assetTag: assets.assetTag,
    })
    .from(assets)
    .where(inArray(assets.id, assetIds));

  if (assetsInDb.length !== assetIds.length) {
    const existingIds = new Set(assetsInDb.map((asset) => asset.id));
    const missingAssetIds = assetIds.filter((assetId) => !existingIds.has(assetId));

    throw new AssignmentServiceError(
      'One or more assets were not found.',
      404,
      'ASSET_NOT_FOUND',
      { missingAssetIds }
    );
  }

  const unavailableAssets = assetsInDb.filter((asset) => asset.status !== 'Available');
  if (unavailableAssets.length > 0) {
    throw new AssignmentServiceError(
      'One or more assets are no longer available.',
      409,
      'ASSET_NOT_AVAILABLE',
      {
        assets: unavailableAssets.map((asset) => ({
          id: asset.id,
          assetTag: asset.assetTag,
          status: asset.status,
        })),
      }
    );
  }

  return assetsInDb;
}

function toDashboardRow(row: AssetRegistryRow): AssignmentsDashboardRow {
  return {
    id: row.id,
    assetTag: row.assetTag,
    name: row.name,
    serialNumber: row.serialNumber,
    category: row.category,
    pillar: row.pillar,
    status: row.status,
    location: row.location,
    assignedTo: row.assignedTo,
    returnedDate: null,
  };
}

async function loadAssetsByStatus(status: AssetStatus): Promise<AssignmentsDashboardRow[]> {
  const rows: AssignmentsDashboardRow[] = [];

  for (const pillar of DASHBOARD_PILLARS) {
    const firstPage = await getAssetsByPillar({
      pillar,
      status,
      page: 1,
      pageSize: BULK_PAGE_SIZE,
    });

    rows.push(...firstPage.data.map(toDashboardRow));

    for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
      const nextPage = await getAssetsByPillar({
        pillar,
        status,
        page,
        pageSize: BULK_PAGE_SIZE,
      });

      rows.push(...nextPage.data.map(toDashboardRow));
    }
  }

  return rows;
}

async function loadReturnedAssets(): Promise<AssignmentsDashboardRow[]> {
  const returnedAssignments = await db
    .select({
      assetId: assetAssignments.assetId,
      assetTag: assets.assetTag,
      name: assets.name,
      serialNumber: assets.serialNumber,
      category: categories.name,
      pillar: categories.pillar,
      location: locations.name,
      assignedTo: users.name,
      returnedDate: assetAssignments.returnedDate,
      assignedDate: assetAssignments.assignedDate,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .leftJoin(users, eq(assetAssignments.assignedToUserId, users.id))
    .where(isNotNull(assetAssignments.returnedDate))
    .orderBy(desc(assetAssignments.returnedDate), desc(assetAssignments.assignedDate));

  const returnedRowsByAssetId = new Map<string, AssignmentsDashboardRow>();

  for (const record of returnedAssignments) {
    if (returnedRowsByAssetId.has(record.assetId)) {
      continue;
    }

    returnedRowsByAssetId.set(record.assetId, {
      id: record.assetId,
      assetTag: record.assetTag,
      name: record.name,
      serialNumber: record.serialNumber,
      category: record.category,
      pillar: record.pillar,
      status: 'Returned',
      location: record.location,
      assignedTo: record.assignedTo,
      returnedDate: record.returnedDate,
    });
  }

  return [...returnedRowsByAssetId.values()];
}

export async function getAssignmentsDashboardData(): Promise<AssignmentsDashboardData> {
  const [available, assigned, returned] = await Promise.all([
    loadAssetsByStatus('Available'),
    loadAssetsByStatus('Assigned'),
    loadReturnedAssets(),
  ]);

  return {
    available,
    assigned,
    returned,
  };
}

export async function assignSingleAsset(
  input: AssignAssetInput,
  assignedById: string
): Promise<AssignmentMutationResult> {
  const normalizedAssetId = input.assetId.trim();

  if (!normalizedAssetId) {
    throw new AssignmentServiceError(
      'Asset ID is required.',
      422,
      'INVALID_ASSET_ID'
    );
  }

  const expectedReturnDate = normalizeExpectedReturnDate(input.expectedReturnDate);
  const notes = normalizeNotes(input.notes);
  const target = await ensureActiveTargetExists(input.assignmentType, input.targetId);

  await validateAssetsForAssignment([normalizedAssetId]);

  return await db.transaction(async (tx) => {
    // Step 1: Update asset status
    const [asset] = await tx
      .update(assets)
      .set({
        status: 'Assigned',
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, normalizedAssetId), eq(assets.status, 'Available')))
      .returning({ id: assets.id, assetTag: assets.assetTag, previousStatus: assets.status });

    if (!asset) {
      throw new AssignmentServiceError(
        'Asset is no longer available.',
        409,
        'ASSET_NOT_AVAILABLE'
      );
    }

    // Step 2: Create assignment record
    const [assignment] = await tx
      .insert(assetAssignments)
      .values({
        assetId: normalizedAssetId,
        assignedById,
        assignedToUserId: target.assignedToUserId,
        assignedToLocationId: target.assignedToLocationId,
        expectedReturnDate,
        notes,
      })
      .returning({ id: assetAssignments.id, assetId: assetAssignments.assetId });

    if (!assignment) {
      throw new AssignmentServiceError(
        'Failed to create assignment record.',
        500,
        'ASSIGNMENT_INSERT_FAILED'
      );
    }

    // Step 3: Create audit log
    await tx.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: normalizedAssetId,
      actionType: 'ASSIGN',
      performedById: assignedById,
      oldValue: {
        status: 'Available',
      },
      newValue: {
        status: 'Assigned',
        assignmentType: input.assignmentType,
        assignedToUserId: target.assignedToUserId,
        assignedToLocationId: target.assignedToLocationId,
        expectedReturnDate,
      },
    });

    return {
      assignedAssetIds: [asset.id],
      assignedCount: 1,
    };
  });
}

export async function assignMultipleAssets(
  input: BulkAssignAssetsInput,
  assignedById: string
): Promise<AssignmentMutationResult> {
  const normalizedAssetIds = dedupeAssetIds(input.assetIds);

  if (normalizedAssetIds.length === 0) {
    throw new AssignmentServiceError(
      'At least one asset ID is required.',
      422,
      'INVALID_ASSET_IDS'
    );
  }

  const expectedReturnDate = normalizeExpectedReturnDate(input.expectedReturnDate);
  const notes = normalizeNotes(input.notes);
  const target = await ensureActiveTargetExists(input.assignmentType, input.targetId);

  await validateAssetsForAssignment(normalizedAssetIds);

  return await db.transaction(async (tx) => {
    // Step 1: Update asset statuses
    const updatedAssets = await tx
      .update(assets)
      .set({
        status: 'Assigned',
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(assets.id, normalizedAssetIds),
          eq(assets.status, 'Available')
        )
      )
      .returning({ id: assets.id });

    if (updatedAssets.length !== normalizedAssetIds.length) {
      throw new AssignmentServiceError(
        'One or more assets are no longer available.',
        409,
        'ASSET_NOT_AVAILABLE'
      );
    }

    // Step 2: Create assignment records
    const insertedAssignments = await tx
      .insert(assetAssignments)
      .values(
        normalizedAssetIds.map((assetId) => ({
          assetId,
          assignedById,
          assignedToUserId: target.assignedToUserId,
          assignedToLocationId: target.assignedToLocationId,
          expectedReturnDate,
          notes,
        }))
      )
      .returning({ id: assetAssignments.id, assetId: assetAssignments.assetId });

    if (insertedAssignments.length !== normalizedAssetIds.length) {
      throw new AssignmentServiceError(
        'Failed to create one or more assignment records.',
        500,
        'ASSIGNMENT_INSERT_FAILED'
      );
    }

    // Step 3: Create audit logs
    await tx.insert(systemAuditLogs).values(
      normalizedAssetIds.map((assetId) => ({
        entityType: 'Asset',
        entityId: assetId,
        actionType: 'ASSIGN',
        performedById: assignedById,
        oldValue: {
          status: 'Available',
        },
        newValue: {
          status: 'Assigned',
          assignmentType: input.assignmentType,
          assignedToUserId: target.assignedToUserId,
          assignedToLocationId: target.assignedToLocationId,
          expectedReturnDate,
        },
      }))
    );

    return {
      assignedAssetIds: updatedAssets.map((a) => a.id),
      assignedCount: updatedAssets.length,
    };
  });
}

export async function getActiveAssignmentsByAssetIds(assetIds: string[]) {
  const normalizedAssetIds = dedupeAssetIds(assetIds);
  if (normalizedAssetIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: assetAssignments.id,
      assetId: assetAssignments.assetId,
      assignedToUserId: assetAssignments.assignedToUserId,
      assignedToLocationId: assetAssignments.assignedToLocationId,
      assignedById: assetAssignments.assignedById,
      assignedDate: assetAssignments.assignedDate,
      expectedReturnDate: assetAssignments.expectedReturnDate,
      notes: assetAssignments.notes,
    })
    .from(assetAssignments)
    .where(
      and(
        inArray(assetAssignments.assetId, normalizedAssetIds),
        isNull(assetAssignments.returnedDate)
      )
    )
    .orderBy(desc(assetAssignments.assignedDate));
}