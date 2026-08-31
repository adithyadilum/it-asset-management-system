import { logInfo } from '@/lib/latency';
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  max,
  lt,
} from 'drizzle-orm';

import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/db';
import {
  assignmentStateEnum,
  assetAssignments,
  assets,
  categories,
  notificationQueue,
  locations,
  models,
  users,
  assetDisposals,
  maintenanceTickets,
} from '@/db/schema';
import { logAuditAction, logAuditActionTx } from '@/lib/audit';
import type { AssetStatus } from '@/lib/data/asset-registry-repo';
import { dispatchAlert } from '@/lib/notifications/dispatcher';
import { EMPLOYEE_ASSIGNMENTS_URL } from '@/lib/notifications/target-urls';
import { resolveReturnStatus } from '@/lib/assignments/return-outcome';
import { sendAssetNotification } from '../notifications';

type AssignmentState = (typeof assignmentStateEnum.enumValues)[number];

export type AssignmentsDashboardTab = 'available' | 'assigned' | 'returned';

const OVERDUE_REFRESH_INTERVAL_MS = 60_000;
let lastOverdueRefreshAt = 0;
let inFlightOverdueRefresh: Promise<void> | null = null;

async function refreshOverdueAssignmentsForDashboard() {
  if (Date.now() - lastOverdueRefreshAt < OVERDUE_REFRESH_INTERVAL_MS) return;
  if (inFlightOverdueRefresh) return inFlightOverdueRefresh;

  inFlightOverdueRefresh = refreshOverdueAssignments()
    .then(() => {
      lastOverdueRefreshAt = Date.now();
    })
    .finally(() => {
      inFlightOverdueRefresh = null;
    });

  return inFlightOverdueRefresh;
}

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

const assignedLocation = alias(locations, 'assigned_location');

const DASHBOARD_PILLARS: Array<
  'Hardware' | 'Office Furniture' | 'Office Electronics' | 'Software'
> = ['Hardware', 'Office Furniture', 'Office Electronics', 'Software'];

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

import { type ProcessReturnPayload } from '@/lib/validations/asset-assignment';

export interface AssignmentMutationResult {
  assignedAssetIds: string[];
  assignedCount: number;
  assignments: { assignmentId: number; assetId: string }[];
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

/**
 * The state a brand-new assignment starts in.
 *
 * Only a person can accept an assignment — `acceptAssignment` matches on
 * `assignedToUserId === currentUser.id`. A location has no one to do that, so a
 * location assignment that started as 'pending approval' could never leave it;
 * it sat in the pending queue forever and inflated every pending count. Those
 * assignments are effective the moment they are made.
 */
function initialAssignmentState(target: {
  assignedToUserId: string | null;
}): AssignmentState {
  return target.assignedToUserId ? 'pending approval' : 'assigned';
}

/**
 * Statuses an asset can be assigned from.
 *
 * 'Assigned' is included because reassigning is a transfer, not an error. A
 * furniture or electronics item moving from one room to another was previously
 * rejected with ASSET_NOT_AVAILABLE -- the first assignment worked and every
 * one after it failed, with no way to move the asset short of returning it
 * first. Anything else (In Repair, Defective, Lost, Disposed) still blocks.
 */
const ASSIGNABLE_STATUSES: AssetStatus[] = ['Available', 'Assigned'];

/**
 * Closes any assignment still open against an asset.
 *
 * Called before a new one is created so a transfer leaves exactly one active
 * assignment behind it. Returning the closed rows lets the caller record what
 * the transfer displaced.
 */
async function closeOpenAssignments(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  assetIds: string[],
  closedById: string
) {
  const closed = await tx
    .update(assetAssignments)
    .set({
      state: 'returned',
      acceptanceStatus: 'transferred',
      returnedDate: new Date(),
    })
    .where(
      and(
        inArray(assetAssignments.assetId, assetIds),
        isNull(assetAssignments.returnedDate)
      )
    )
    .returning({
      id: assetAssignments.id,
      assetId: assetAssignments.assetId,
    });

  if (closed.length === 0) {
    return closed;
  }

  // Any acceptance still queued against the old assignment is moot.
  await tx
    .update(notificationQueue)
    .set({ isProcessed: true })
    .where(
      inArray(
        notificationQueue.assignmentId,
        closed.map((row) => row.id)
      )
    );

  await Promise.all(
    closed.map((row) =>
      logAuditActionTx(tx, {
        entityType: 'asset_assignment',
        entityId: String(row.id),
        actionType: 'RETURN',
        performedById: closedById,
        oldData: null,
        newData: {
          state: 'returned',
          acceptanceStatus: 'transferred',
        },
      })
    )
  );

  return closed;
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
    (asset) => !ASSIGNABLE_STATUSES.includes(asset.status as AssetStatus)
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

async function enqueuePendingAcceptanceNotification(
  assignmentId: number,
  recipientId: string
) {
  const [notification] = await db
    .insert(notificationQueue)
    .values({
      eventType: 'PENDING_ACCEPTANCE',
      assignmentId,
      recipientId,
    })
    .onConflictDoNothing()
    .returning({ id: notificationQueue.id });

  if (!notification) {
    return;
  }

  await dispatchAlert({
    eventType: 'ASSIGNMENT_PENDING',
    userId: recipientId,
    title: 'Action Required: Assignment Pending',
    // Employees have no dashboard — /dashboard only bounced them to /my-assets,
    // which is where the accept and decline controls actually live.
    message:
      'You have a new asset awaiting your acknowledgment. Please review and accept it from My Assets.',
    targetUrl: EMPLOYEE_ASSIGNMENTS_URL,
  });
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
      assignedToLocationName: assignedLocation.name,
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
    .leftJoin(
      assignedLocation,
      eq(assetAssignments.assignedToLocationId, assignedLocation.id)
    )
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
    // Falls back to the assigned location: furniture and electronics are
    // assigned to a place, so there is no user to name.
    assignedTo: row.assignedToUser || row.assignedToLocationName || null,
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
      assignedToLocationName: assignedLocation.name,
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
    .leftJoin(
      assignedLocation,
      eq(assetAssignments.assignedToLocationId, assignedLocation.id)
    )
    .where(
      and(
        eq(assets.status, 'Assigned'),
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
    status: 'Assigned',
    location: row.assetLocation,
    assignmentId: row.assignmentId,
    assignedTo: row.assignedToUser || row.assignedToLocationName || null,
    assignedToEmail: row.assignedToEmail || null,
    assignedDate: row.assignedDate,
    expectedReturnDate: row.expectedReturnDate
      ? new Date(row.expectedReturnDate)
      : null,
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
    .where(
      and(
        isNotNull(assetAssignments.returnedDate),
        eq(assets.status, 'Returned')
      )
    )
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

export async function getAssignmentsDashboardData(
  tab?: AssignmentsDashboardTab
): Promise<AssignmentsDashboardData> {
  // Automatic refresh of overdue states on data load
  await refreshOverdueAssignmentsForDashboard();

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

  const result = await db.transaction(async (tx) => {
    // Step 1: Update asset status
    const [asset] = await tx
      .update(assets)
      .set({
        status: 'Assigned',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assets.id, normalizedAssetId),
          inArray(assets.status, ASSIGNABLE_STATUSES)
        )
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

    // Transfer: close whatever this asset was assigned to before, so it ends up
    // with exactly one open assignment rather than two.
    await closeOpenAssignments(tx, [normalizedAssetId], assignedById);

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
        state: initialAssignmentState(target),
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
        state: initialAssignmentState(target),
      },
    });

    return {
      assignedAssetIds: [asset.id],
      assignedCount: 1,
      assignments: [{ assignmentId: assignment.id, assetId: asset.id }],
    };
  });

  if (target.assignedToUserId) {
    try {
      await enqueuePendingAcceptanceNotification(
        result.assignments[0].assignmentId,
        target.assignedToUserId
      );
    } catch (error) {
      console.error(
        'Failed to enqueue pending acceptance notification for assignment:',
        error
      );
    }
  }

  return result;
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

  const result = await db.transaction(async (tx) => {
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
          inArray(assets.status, ASSIGNABLE_STATUSES)
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

    // Transfer: close whatever these assets were assigned to before, so each
    // ends up with exactly one open assignment rather than two.
    await closeOpenAssignments(tx, normalizedAssetIds, assignedById);

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
          state: initialAssignmentState(target),
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
            state: initialAssignmentState(target),
          },
        })
      )
    );

    return {
      assignedAssetIds: updatedAssets.map((a) => a.id),
      assignedCount: updatedAssets.length,
      assignments: insertedAssignments.map((assignment) => ({
        assignmentId: assignment.id,
        assetId: assignment.assetId,
      })),
    };
  });

  if (target.assignedToUserId) {
    try {
      await Promise.all(
        result.assignments.map((assignment) =>
          enqueuePendingAcceptanceNotification(
            assignment.assignmentId,
            target.assignedToUserId as string
          )
        )
      );
    } catch (error) {
      console.error(
        'Failed to enqueue pending acceptance notifications for bulk assignment:',
        error
      );
    }
  }

  return result;
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
  newState:
    'pending approval' | 'assigned' | 'overdue' | 'requested' | 'returned'
): Promise<void> {
  if (assignmentIds.length === 0) return;

  const updated = await db
    .update(assetAssignments)
    .set({ state: newState })
    .where(inArray(assetAssignments.id, assignmentIds))
    .returning({ id: assetAssignments.id });

  if (updated.length === 0) {
    throw new AssignmentServiceError(
      'Failed to update assignments state.',
      500,
      'UPDATE_FAILED'
    );
  }
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
      assignedToUserId: assetAssignments.assignedToUserId,
      state: assetAssignments.state,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(users, eq(assetAssignments.assignedToUserId, users.id))
    .where(inArray(assetAssignments.id, assignmentIds));

  await Promise.all(
    assignments.map(async (a) => {
      // Two different nudges share this button, and they are not
      // interchangeable: an assignment still awaiting acknowledgement needs
      // "please accept this", while one already held past its return date
      // needs "please bring it back". Both were previously sent as
      // RETURN_REQUESTED with return wording, so somebody who had not yet
      // accepted an asset was told to return it.
      const awaitingAcknowledgement = a.state === 'pending approval';
      const assetLabel = a.assetName || a.assetTag;

      await sendAssetNotification({
        type: awaitingAcknowledgement
          ? 'assignment_reminder'
          : 'return_request',
        recipientEmail: a.userEmail,
        assetTag: a.assetTag,
        assetName: assetLabel,
      });

      if (a.assignedToUserId) {
        try {
          await dispatchAlert(
            awaitingAcknowledgement
              ? {
                  eventType: 'ASSIGNMENT_PENDING',
                  userId: a.assignedToUserId,
                  title: 'Reminder: Assignment Awaiting Acknowledgement',
                  message: `${assetLabel} is still waiting for you to accept it.`,
                  targetUrl: EMPLOYEE_ASSIGNMENTS_URL,
                }
              : {
                  eventType: 'RETURN_REQUESTED',
                  userId: a.assignedToUserId,
                  title: 'Return Reminder',
                  message: `Reminder: IT has requested the return of ${assetLabel}.`,
                  targetUrl: EMPLOYEE_ASSIGNMENTS_URL,
                }
          );
        } catch (error) {
          console.error('Failed to dispatch in-app reminder alert:', error);
        }
      }

      // Log reminder action
      await logAuditAction({
        entityType: 'Asset',
        entityId: a.assetId,
        actionType: 'UPDATE',
        performedById,
        newData: {
          notificationSent: awaitingAcknowledgement
            ? 'acknowledgement_reminder'
            : 'return_reminder',
        },
      });
    })
  );
}

/**
 * Triggers a return request and updates state to 'requested'.
 * Supports re-requesting: if state is already 'requested', updates returnRequestedAt
 * and re-dispatches the in-app alert without throwing.
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
      assignedToUserId: assetAssignments.assignedToUserId,
      state: assetAssignments.state,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(users, eq(assetAssignments.assignedToUserId, users.id))
    .where(inArray(assetAssignments.id, assignmentIds));

  await db.transaction(async (tx) => {
    // Update state to 'requested' and refresh returnRequestedAt
    const updated = await tx
      .update(assetAssignments)
      .set({
        state: 'requested',
        returnRequestedAt: new Date(),
      })
      .where(inArray(assetAssignments.id, assignmentIds))
      .returning({ id: assetAssignments.id });

    if (updated.length === 0) {
      throw new AssignmentServiceError(
        'Failed to trigger return requests.',
        500,
        'UPDATE_FAILED'
      );
    }

    // Log audit
    await Promise.all(
      assignments.map(async (a) => {
        await logAuditActionTx(tx, {
          entityType: 'Asset',
          entityId: a.assetId,
          actionType: 'UPDATE',
          performedById,
          oldData: { state: a.state },
          newData: { state: 'requested' },
        });
      })
    );
  });

  // Send notifications outside transaction
  await Promise.allSettled(
    assignments.map(async (a) => {
      try {
        await sendAssetNotification({
          type: 'return_request',
          recipientEmail: a.userEmail,
          assetTag: a.assetTag,
          assetName: a.assetName || a.assetTag,
        });
      } catch (error) {
        console.error(
          'Failed to send return request email notification:',
          error
        );
      }

      // Dispatch in-app alert to employee dashboard
      if (a.assignedToUserId) {
        try {
          await dispatchAlert({
            eventType: 'RETURN_REQUESTED',
            userId: a.assignedToUserId,
            title: 'Return Requested',
            message: `IT has requested the immediate return of ${a.assetName || a.assetTag}.`,
            targetUrl: EMPLOYEE_ASSIGNMENTS_URL,
          });
        } catch (error) {
          console.error(
            'Failed to dispatch in-app return request alert:',
            error
          );
        }
      }
    })
  );
}

/**
 * Marks assets as received and updates state to 'returned'.
 * This also updates the asset status to 'Returned' (pending inspection).
 */
export async function markAssignmentsAsReceived(
  assignmentIds: number[],
  performedById: string
): Promise<{
  assignments: Array<{ assignmentId: number; assetId: string }>;
}> {
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
    return { assignments: [] };
  }

  const activeAssignmentIds = assignments.map((a) => a.id);
  const assetIds = assignments.map((a) => a.assetId);

  await db.transaction(async (tx) => {
    // Update assignments state to 'returned' and set returnedDate
    const updatedAssignments = await tx
      .update(assetAssignments)
      .set({
        state: 'returned',
        returnedDate: new Date(),
      })
      .where(inArray(assetAssignments.id, activeAssignmentIds))
      .returning({ id: assetAssignments.id });

    if (updatedAssignments.length === 0) {
      throw new AssignmentServiceError(
        'Failed to mark assignments as received.',
        500,
        'UPDATE_FAILED'
      );
    }

    // Update assets status to 'Returned' (pending condition check)
    if (assetIds.length > 0) {
      const updatedAssets = await tx
        .update(assets)
        .set({ status: 'Returned', updatedAt: new Date() })
        .where(inArray(assets.id, assetIds))
        .returning({ id: assets.id });

      if (updatedAssets.length === 0) {
        throw new AssignmentServiceError(
          'Failed to update asset status to returned.',
          500,
          'UPDATE_FAILED'
        );
      }
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
          newData: { status: 'Returned' },
        })
      )
    );
  });

  return {
    assignments: assignments.map((assignment) => ({
      assignmentId: assignment.id,
      assetId: assignment.assetId,
    })),
  };
}

/**
 * Updates assignments with passed due dates to 'overdue' state.
 */
export async function refreshOverdueAssignments(): Promise<void> {
  const now = new Date();
  const updated = await db
    .update(assetAssignments)
    .set({ state: 'overdue' })
    .where(
      and(
        eq(assetAssignments.state, 'assigned'),
        isNotNull(assetAssignments.expectedReturnDate),
        lt(assetAssignments.expectedReturnDate, now.toISOString())
      )
    )
    .returning({ id: assetAssignments.id });

  if (updated.length > 0) {
    logInfo(`Refreshed ${updated.length} overdue assignments.`);
  }

  // Optional: We can log how many were overdue, but for now we just satisfy the returning rule.
  // We do not throw if 0 rows are updated, as that is expected if none are overdue.
}

/**
 * Transitions an assignment from 'pending approval' to 'assigned'.
 * Typically called when a user accepts an asset.
 */
export async function acceptAssignment(assignmentId: number): Promise<void> {
  const updated = await db
    .update(assetAssignments)
    .set({ state: 'assigned' })
    .where(
      and(
        eq(assetAssignments.id, assignmentId),
        eq(assetAssignments.state, 'pending approval')
      )
    )
    .returning({ id: assetAssignments.id });

  if (updated.length === 0) {
    throw new AssignmentServiceError(
      'Failed to accept assignment. Assignment not found or invalid state.',
      404,
      'ASSIGNMENT_NOT_FOUND'
    );
  }
}

/**
 * Withdraws an assignment that has not been acknowledged yet.
 *
 * The counterpart to the employee's decline: same end state, but initiated by
 * the person who created the assignment rather than the person receiving it.
 * Without it, a mistaken assignment could only be resolved by asking the
 * assignee to reject something they never wanted.
 *
 * Restricted to 'pending approval' on purpose — once the assignee has accepted,
 * the asset is genuinely in their hands and giving it back is a return, not a
 * cancellation.
 */
export async function cancelPendingAssignment(
  assignmentId: number,
  cancelledById: string,
  options: { allowAnyInitiator: boolean }
): Promise<{ assetId: string }> {
  const [assignment] = await db
    .select({
      id: assetAssignments.id,
      assetId: assetAssignments.assetId,
      state: assetAssignments.state,
      assignedById: assetAssignments.assignedById,
      assignedToUserId: assetAssignments.assignedToUserId,
    })
    .from(assetAssignments)
    .where(eq(assetAssignments.id, assignmentId))
    .limit(1);

  if (!assignment) {
    throw new AssignmentServiceError(
      'Assignment not found.',
      404,
      'ASSIGNMENT_NOT_FOUND'
    );
  }

  if (
    !options.allowAnyInitiator &&
    String(assignment.assignedById) !== String(cancelledById)
  ) {
    throw new AssignmentServiceError(
      'Only the person who created this assignment can cancel it.',
      403,
      'NOT_ASSIGNMENT_INITIATOR'
    );
  }

  if (assignment.state !== 'pending approval') {
    throw new AssignmentServiceError(
      'Only an assignment still awaiting acknowledgment can be cancelled.',
      409,
      'ASSIGNMENT_NOT_PENDING'
    );
  }

  await db.transaction(async (tx) => {
    // Re-check the state inside the transaction: the assignee may be accepting
    // at this very moment, and cancelling underneath them would leave the asset
    // marked Available while they believe they hold it.
    const [updated] = await tx
      .update(assetAssignments)
      .set({
        state: 'returned',
        acceptanceStatus: 'cancelled',
        returnedDate: new Date(),
      })
      .where(
        and(
          eq(assetAssignments.id, assignmentId),
          eq(assetAssignments.state, 'pending approval')
        )
      )
      .returning({ id: assetAssignments.id });

    if (!updated) {
      throw new AssignmentServiceError(
        'Assignment is no longer pending acknowledgment.',
        409,
        'ASSIGNMENT_NOT_PENDING'
      );
    }

    await tx
      .update(notificationQueue)
      .set({ isProcessed: true })
      .where(eq(notificationQueue.assignmentId, assignmentId));

    await tx
      .update(assets)
      .set({ status: 'Available' })
      .where(eq(assets.id, assignment.assetId));

    await logAuditActionTx(tx, {
      entityType: 'asset_assignment',
      entityId: String(assignmentId),
      actionType: 'RETURN',
      performedById: cancelledById,
      oldData: { state: 'pending approval' },
      newData: {
        state: 'returned',
        acceptanceStatus: 'cancelled',
      },
    });
  });

  // Tell the assignee it is gone, so a pending item does not linger in their
  // notification list pointing at an assignment they can no longer act on.
  if (assignment.assignedToUserId) {
    try {
      await dispatchAlert({
        eventType: 'ASSIGNMENT_DECLINED',
        userId: assignment.assignedToUserId,
        title: 'Assignment Cancelled',
        message: `Assignment #${assignmentId} was cancelled before you acknowledged it. No action is needed.`,
        targetUrl: EMPLOYEE_ASSIGNMENTS_URL,
      });
    } catch (error) {
      console.error('Failed to dispatch assignment cancelled alert:', error);
    }
  }

  return { assetId: assignment.assetId };
}

/**
 * Processes a returned asset with physical condition check.
 */
export async function processAssetReturn(
  input: ProcessReturnPayload,
  performedById: string
): Promise<void> {
  const asset = await db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      status: assets.status,
    })
    .from(assets)
    .where(eq(assets.id, input.assetId))
    .limit(1)
    .then((res) => res[0]);

  if (!asset) {
    throw new AssignmentServiceError('Asset not found', 404, 'ASSET_NOT_FOUND');
  }

  // Shared with the return form, which previews this before submitting.
  const newStatus = resolveReturnStatus(input.condition) ?? 'Available';

  await db.transaction(async (tx) => {
    // 1. Update asset status and physical condition
    const updated = await tx
      .update(assets)
      .set({
        status: newStatus,
        condition: input.physicalCondition,
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, input.assetId), eq(assets.status, 'Returned')))
      .returning({ id: assets.id });

    if (updated.length === 0) {
      throw new AssignmentServiceError(
        'Failed to process return. Asset not found or not in Returned status.',
        400,
        'UPDATE_FAILED'
      );
    }

    // 2. Create routing tickets if needed
    if (newStatus === 'In Repair') {
      await tx.insert(maintenanceTickets).values({
        assetId: input.assetId,
        ticketType: 'INTERNAL',
        reportedIssue: `Post-return condition check: ${input.condition}. Notes: ${input.notes || 'None'}`,
        status: 'ACTIVE',
        dispatchedById: performedById,
      });
    } else if (newStatus === 'Pending Disposal') {
      await tx.insert(assetDisposals).values({
        assetId: input.assetId,
        requestedById: performedById,
        reason: 'Post-return Condition Check',
        justification: `Condition: ${input.condition}. Notes: ${input.notes || 'None'}`,
        status: 'Pending Approval',
        requestedAt: new Date(),
      });
    }

    // 2. We assume the asset assignment is already in 'returned' state, or we update it here.
    // If we need to mark it returned, we could do it. However, the user story implies it's ALREADY in
    // the "Returned Assets" pool, which means `state = returned`, `returnedDate` is NOT NULL.

    // 3. Log Audit Action with condition notes
    await logAuditActionTx(tx, {
      entityType: 'Asset',
      entityId: input.assetId,
      actionType: 'STATUS_CHANGE',
      performedById,
      oldData: { status: asset.status },
      newData: {
        status: newStatus,
        notes: input.notes,
        condition: input.condition,
      },
    });
  });
}
