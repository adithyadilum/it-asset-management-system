import { and, desc, eq, inArray, isNotNull, isNull, max, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  assignmentStateEnum,
  assetAssignments,
  assets,
  categories,
  locations,
  models,
  users,
} from '@/db/schema';
import { logAuditAction, logAuditActionTx } from '@/lib/audit';
import type { AssetStatus } from '@/lib/data/asset-registry-repo';
import { sendAssetNotification } from '../notifications';

type AssignmentState = (typeof assignmentStateEnum.enumValues)[number];

export type AssignmentsDashboardTab = 'available' | 'assigned' | 'returned';

export interface AssignmentsDashboardRow {
  id: string;
  assetTag: string;
  name: string | null;
  serialNumber: string | null;
  category: string;
  pillar: string;
  status: AssetStatus | 'Returned';
  state: 'pending approval' | 'assigned' | 'overdue' | 'requested' | 'returned';
  location: string | null;
  assignmentId?: number | null;
  assignedTo: string | null;
  assignedToEmail?: string | null;
  assignedDate?: Date | null;
  expectedReturnDate?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  returnedDate: Date | null;
}

export interface AssignmentsDashboardData {
  available: AssignmentsDashboardRow[];
  assigned: AssignmentsDashboardRow[];
  returned: AssignmentsDashboardRow[];
}

const DASHBOARD_PILLARS: Array<
  'IT & Digital' | 'Office Furniture' | 'Office Electronics'
> = ['IT & Digital', 'Office Furniture', 'Office Electronics'];

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
    .where(
      and(eq(locations.id, normalizedLocationId), eq(locations.isActive, true))
    )
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
  return [
    ...new Set(assetIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  ];
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
    const missingAssetIds = assetIds.filter(
      (assetId) => !existingIds.has(assetId)
    );

    throw new AssignmentServiceError(
      'One or more assets were not found.',
      404,
      'ASSET_NOT_FOUND',
      { missingAssetIds }
    );
  }

  const unavailableAssets = assetsInDb.filter(
    (asset) => asset.status !== 'Available'
  );
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

async function loadAssetsByStatusDirect(
  status: AssetStatus
): Promise<AssignmentsDashboardRow[]> {
  // Single direct DB query instead of multiple API calls across pillars
  const results = await db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      name: assets.name,
      serialNumber: assets.serialNumber,
      category: categories.name,
      pillar: categories.pillar,
      assetLocation: locations.name,
      assignedToUser: users.name,
      assignedToEmail: users.email,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
      assignedToLocationId: assetAssignments.assignedToLocationId,
      state: assetAssignments.state,
    })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .leftJoin(
      assetAssignments,
      and(
        eq(assetAssignments.assetId, assets.id),
        isNull(assetAssignments.returnedDate)
      )
    )
    .leftJoin(users, eq(assetAssignments.assignedToUserId, users.id))
    .where(
      and(
        eq(assets.status, status),
        inArray(categories.pillar, DASHBOARD_PILLARS)
      )
    )
    .orderBy(desc(assets.createdAt));

  return results.map((row) => ({
    id: row.id,
    assetTag: row.assetTag,
    name: row.name,
    serialNumber: row.serialNumber,
    category: row.category,
    pillar: row.pillar,
    status: status,
    location: row.assetLocation,
    assignedTo: row.assignedToUser || null,
    assignedToEmail: row.assignedToEmail || null,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
    returnedDate: null,
    state: row.state as AssignmentState,
  }));
}

async function loadAssignedAssetsDirect(): Promise<AssignmentsDashboardRow[]> {
  const latestActiveAssignments = db
    .select({
      assetId: assetAssignments.assetId,
      latestAssignmentId: max(assetAssignments.id).as('latestAssignmentId'),
    })
    .from(assetAssignments)
    .where(isNull(assetAssignments.returnedDate))
    .groupBy(assetAssignments.assetId)
    .as('latest_active_assignments');

  const results = await db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      name: assets.name,
      serialNumber: assets.serialNumber,
      category: categories.name,
      pillar: categories.pillar,
      assetLocation: locations.name,
      assignmentId: assetAssignments.id,
      assignedToUser: users.name,
      assignedToEmail: users.email,
      assignedDate: assetAssignments.assignedDate,
      expectedReturnDate: assetAssignments.expectedReturnDate,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
      state: assetAssignments.state,
    })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .innerJoin(
      latestActiveAssignments,
      eq(latestActiveAssignments.assetId, assets.id)
    )
    .innerJoin(
      assetAssignments,
      eq(assetAssignments.id, latestActiveAssignments.latestAssignmentId)
    )
    .leftJoin(users, eq(assetAssignments.assignedToUserId, users.id))
    .where(and(eq(assets.status, 'Assigned'), inArray(categories.pillar, DASHBOARD_PILLARS)))
    .orderBy(desc(assets.createdAt));

  return results.map((row) => ({
    id: row.id,
    assetTag: row.assetTag,
    name: row.name,
    serialNumber: row.serialNumber,
    category: row.category,
    pillar: row.pillar,
    status: 'Assigned',
    location: row.assetLocation,
    assignmentId: row.assignmentId,
    assignedTo: row.assignedToUser || null,
    assignedToEmail: row.assignedToEmail || null,
    assignedDate: row.assignedDate,
    expectedReturnDate: row.expectedReturnDate ? new Date(row.expectedReturnDate) : null,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
    returnedDate: null,
    state: row.state as AssignmentState,
  }));
}

async function loadAssetsByStatus(
  status: AssetStatus
): Promise<AssignmentsDashboardRow[]> {
  if (status === 'Assigned') {
    return loadAssignedAssetsDirect();
  }

  return loadAssetsByStatusDirect(status);
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
    .orderBy(
      desc(assetAssignments.returnedDate),
      desc(assetAssignments.assignedDate)
    );

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
      state: 'returned',
    });
  }

  return [...returnedRowsByAssetId.values()];
}

export async function getAssignmentsDashboardData(tab?: AssignmentsDashboardTab): Promise<AssignmentsDashboardData> {
  // Automatic refresh of overdue states on data load
  await refreshOverdueAssignments();

  if (tab === 'assigned') {
    const assigned = await loadAssetsByStatus('Assigned');
    return { available: [], assigned, returned: [] };
  }

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

  const expectedReturnDate = normalizeExpectedReturnDate(
    input.expectedReturnDate
  );
  const notes = normalizeNotes(input.notes);
  const target = await ensureActiveTargetExists(
    input.assignmentType,
    input.targetId
  );

  await validateAssetsForAssignment([normalizedAssetId]);

  return await db.transaction(async (tx) => {
    // Step 1: Update asset status
    const [asset] = await tx
      .update(assets)
      .set({
        status: 'Assigned',
        updatedAt: new Date(),
      })
      .where(
        and(eq(assets.id, normalizedAssetId), eq(assets.status, 'Available'))
      )
      .returning({
        id: assets.id,
        assetTag: assets.assetTag,
        previousStatus: assets.status,
      });

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
        state: 'pending approval',
      })
      .returning({
        id: assetAssignments.id,
        assetId: assetAssignments.assetId,
      });

    if (!assignment) {
      throw new AssignmentServiceError(
        'Failed to create assignment record.',
        500,
        'ASSIGNMENT_INSERT_FAILED'
      );
    }

    // Step 3: Create audit log (transaction-safe helper)
    await logAuditActionTx(tx, {
      entityType: 'Asset',
      entityId: normalizedAssetId,
      actionType: 'ASSIGN',
      performedById: assignedById,
      oldData: {
        status: 'Available',
      },
      newData: {
        status: 'Assigned',
        assignmentType: input.assignmentType,
        assignedToUserId: target.assignedToUserId,
        assignedToLocationId: target.assignedToLocationId,
        expectedReturnDate,
        state: 'pending approval',
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

  const expectedReturnDate = normalizeExpectedReturnDate(
    input.expectedReturnDate
  );
  const notes = normalizeNotes(input.notes);
  const target = await ensureActiveTargetExists(
    input.assignmentType,
    input.targetId
  );

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
          state: 'pending approval' as AssignmentState,
        }))
      )
      .returning({
        id: assetAssignments.id,
        assetId: assetAssignments.assetId,
      });

    if (insertedAssignments.length !== normalizedAssetIds.length) {
      throw new AssignmentServiceError(
        'Failed to create one or more assignment records.',
        500,
        'ASSIGNMENT_INSERT_FAILED'
      );
    }

    // Step 3: Create audit logs (transaction-safe helper)
    await Promise.all(
      normalizedAssetIds.map((assetId) =>
        logAuditActionTx(tx, {
          entityType: 'Asset',
          entityId: assetId,
          actionType: 'ASSIGN',
          performedById: assignedById,
          oldData: {
            status: 'Available',
          },
          newData: {
            status: 'Assigned',
            assignmentType: input.assignmentType,
            assignedToUserId: target.assignedToUserId,
            assignedToLocationId: target.assignedToLocationId,
            expectedReturnDate,
            state: 'pending approval',
          },
        })
      )
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

/**
 * Updates the state of one or more assignments.
 */
export async function updateAssignmentsState(
  assignmentIds: number[],
  newState: 'pending approval' | 'assigned' | 'overdue' | 'requested' | 'returned'
): Promise<void> {
  if (assignmentIds.length === 0) return;

  await db
    .update(assetAssignments)
    .set({ state: newState })
    .where(inArray(assetAssignments.id, assignmentIds));
}

/**
 * Triggers a reminder notification for pending assignments.
 */
export async function triggerAssignmentReminders(
  assignmentIds: number[],
  performedById: string
): Promise<void> {
  const assignments = await db
    .select({
      id: assetAssignments.id,
      assetId: assetAssignments.assetId,
      assetTag: assets.assetTag,
      assetName: assets.name,
      userEmail: users.email,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(users, eq(assetAssignments.assignedToUserId, users.id))
    .where(inArray(assetAssignments.id, assignmentIds));

  await Promise.all(
    assignments.map(async (a) => {
      // Send notification
      await sendAssetNotification({
        type: 'assignment_reminder',
        recipientEmail: a.userEmail,
        assetTag: a.assetTag,
        assetName: a.assetName || a.assetTag,
      });

      // Log reminder action
      await logAuditAction({
        entityType: 'Asset',
        entityId: a.assetId,
        actionType: 'UPDATE',
        performedById,
        newData: { notificationSent: 'assignment_reminder' },
      });
    })
  );
}

/**
 * Triggers a return request and updates state to 'requested'.
 */
export async function triggerReturnRequests(
  assignmentIds: number[],
  performedById: string
): Promise<void> {
  const assignments = await db
    .select({
      id: assetAssignments.id,
      assetId: assetAssignments.assetId,
      assetTag: assets.assetTag,
      assetName: assets.name,
      userEmail: users.email,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(users, eq(assetAssignments.assignedToUserId, users.id))
    .where(inArray(assetAssignments.id, assignmentIds));

  await db.transaction(async (tx) => {
    // Update state to 'requested'
    await tx
      .update(assetAssignments)
      .set({ 
        state: 'requested',
        returnRequestedAt: new Date()
      })
      .where(inArray(assetAssignments.id, assignmentIds));

    // Send notifications and log audit
    await Promise.all(
      assignments.map(async (a) => {
        await sendAssetNotification({
          type: 'return_request',
          recipientEmail: a.userEmail,
          assetTag: a.assetTag,
          assetName: a.assetName || a.assetTag,
        });

        await logAuditActionTx(tx, {
          entityType: 'Asset',
          entityId: a.assetId,
          actionType: 'UPDATE',
          performedById,
          oldData: { state: 'assigned' },
          newData: { state: 'requested' },
        });
      })
    );
  });
}

/**
 * Marks assets as received and updates state to 'returned'.
 * This also updates the asset status back to 'Available'.
 */
export async function markAssignmentsAsReceived(
  assignmentIds: number[],
  performedById: string
): Promise<void> {
  const assignments = await db
    .select({
      id: assetAssignments.id,
      assetId: assetAssignments.assetId,
      assetTag: assets.assetTag,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .where(
      and(
        inArray(assetAssignments.id, assignmentIds),
        isNull(assetAssignments.returnedDate)
      )
    );

  if (assignments.length === 0) {
    return;
  }

  const activeAssignmentIds = assignments.map((a) => a.id);

  const assetIds = assignments.map((a) => a.assetId);

  await db.transaction(async (tx) => {
    // Update assignments state to 'returned' and set returnedDate
    await tx
      .update(assetAssignments)
      .set({ 
        state: 'returned',
        returnedDate: new Date()
      })
      .where(inArray(assetAssignments.id, activeAssignmentIds));

    // Update assets status back to 'Available'
    if (assetIds.length > 0) {
      await tx
        .update(assets)
        .set({ status: 'Available', updatedAt: new Date() })
        .where(inArray(assets.id, assetIds));
    }

    // Log audit for each asset
    await Promise.all(
      assignments.map((a) =>
        logAuditActionTx(tx, {
          entityType: 'Asset',
          entityId: a.assetId,
          actionType: 'RETURN',
          performedById,
          oldData: { status: 'Assigned' },
          newData: { status: 'Available' },
        })
      )
    );
  });
}

/**
 * Updates assignments with passed due dates to 'overdue' state.
 */
export async function refreshOverdueAssignments(): Promise<void> {
  const now = new Date();
  await db
    .update(assetAssignments)
    .set({ state: 'overdue' })
    .where(
      and(
        eq(assetAssignments.state, 'assigned'),
        isNotNull(assetAssignments.expectedReturnDate),
        sql`${assetAssignments.expectedReturnDate} < ${now.toISOString()}`
      )
    );
}

/**
 * Transitions an assignment from 'pending approval' to 'assigned'.
 * Typically called when a user accepts an asset.
 */
export async function acceptAssignment(assignmentId: number): Promise<void> {
  await db
    .update(assetAssignments)
    .set({ state: 'assigned' })
    .where(
      and(
        eq(assetAssignments.id, assignmentId),
        eq(assetAssignments.state, 'pending approval')
      )
    );
}
