'use server';

import { revalidatePath } from 'next/cache';

import {
  bulkUpdateAssets as bulkUpdateAssetsRepo,
  getAssetsByPillar as getAssetsByPillarRepo,
  getCategoriesByPillar as getCategoriesByPillarRepo,
  getAllAssetsUnified as getAllAssetsUnifiedRepo,
  type AssetCondition,
  type AssetRegistryFilters,
  type UnifiedRegistryFilters,
  type AssetStatus,
  type BulkAssetUpdatePayload,
  type RegistryPillar,
} from '@/lib/data/asset-registry-repo';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { isValidUuid } from '@/lib/auth/uuid';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 16;
const MAX_PAGE_SIZE = 100;

export interface AssetsGridQueryInput {
  pillar: unknown;
  query?: unknown;
  categoryId?: unknown;
  status?: unknown;
  page?: unknown;
  pageSize?: unknown;
}

export interface BulkUpdateAssetsInput {
  assetIds: string[];
  updates: Partial<BulkAssetUpdatePayload>;
  actionType?: string;
}

function normalizePillar(pillar: unknown): RegistryPillar | null {
  if (typeof pillar !== 'string') {
    return null;
  }

  const normalizedPillar = pillar.trim().toLowerCase();

  if (normalizedPillar === 'it & digital' || normalizedPillar === 'hardware') {
    return 'IT & Digital';
  }

  if (normalizedPillar === 'software') {
    return 'Software';
  }

  if (
    normalizedPillar === 'office furniture' ||
    normalizedPillar === 'furniture' ||
    normalizedPillar === 'furniture & fixtures'
  ) {
    return 'Office Furniture';
  }

  if (
    normalizedPillar === 'office electronics' ||
    normalizedPillar === 'electronics'
  ) {
    return 'Office Electronics';
  }

  return null;
}

function normalizeAssetStatus(status: unknown): AssetStatus | undefined {
  if (
    status === 'Available' ||
    status === 'Assigned' ||
    status === 'In Repair' ||
    status === 'Defective' ||
    status === 'Lost' ||
    status === 'Retired' ||
    status === 'Pending Disposal' ||
    status === 'Disposed'
  ) {
    return status;
  }

  return undefined;
}

function normalizeAssetCondition(condition: unknown): AssetCondition | null {
  if (condition === null) {
    return null;
  }

  if (
    condition === 'New' ||
    condition === 'Excellent' ||
    condition === 'Fair' ||
    condition === 'Poor' ||
    condition === 'Damaged'
  ) {
    return condition;
  }

  return null;
}

function normalizePage(value: unknown, fallback: number) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.floor(parsedValue);
}

function normalizePageSize(value: unknown) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(Math.floor(parsedValue), MAX_PAGE_SIZE);
}

function normalizeCategoryId(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return undefined;
  }

  return parsedValue;
}

function normalizeQuery(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedQuery = value.trim();
  return trimmedQuery.length > 0 ? trimmedQuery : undefined;
}

function normalizeBulkAssetIds(assetIds: string[]) {
  const normalizedAssetIds = new Set<string>();

  for (const assetId of assetIds) {
    if (!isValidUuid(assetId)) {
      continue;
    }

    normalizedAssetIds.add(assetId);
  }

  return [...normalizedAssetIds];
}

function normalizeBulkUpdates(updates: Partial<BulkAssetUpdatePayload>) {
  const normalizedUpdates: Partial<BulkAssetUpdatePayload> = {};

  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    const normalizedStatus = normalizeAssetStatus(updates.status);

    if (!normalizedStatus) {
      throw new Error('Invalid status value.');
    }

    normalizedUpdates.status = normalizedStatus;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'locationId')) {
    if (updates.locationId === null || updates.locationId === undefined) {
      normalizedUpdates.locationId = null;
    } else {
      const parsedLocationId = Number(updates.locationId);

      if (!Number.isInteger(parsedLocationId) || parsedLocationId <= 0) {
        throw new Error('Invalid location id.');
      }

      normalizedUpdates.locationId = parsedLocationId;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'condition')) {
    if (updates.condition === null || updates.condition === undefined) {
      normalizedUpdates.condition = null;
    } else {
      const normalizedCondition = normalizeAssetCondition(updates.condition);

      if (!normalizedCondition) {
        throw new Error('Invalid condition value.');
      }

      normalizedUpdates.condition = normalizedCondition;
    }
  }

  return normalizedUpdates;
}

export async function getCategoriesByPillar(pillarInput: unknown) {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser || !canManageAssets(currentUser.role)) {
    throw new Error(
      'Forbidden: You do not have permission to read asset categories.'
    );
  }

  const pillar = normalizePillar(pillarInput);
  if (!pillar) {
    throw new Error('Invalid pillar value.');
  }

  try {
    const queryTimer = startLatencyTimer();
    try {
      return await getCategoriesByPillarRepo(pillar);
    } finally {
      logLatency({
        scope: 'DB ACTION',
        label: 'assetsRegistry.getCategoriesByPillar.query',
        startTime: queryTimer,
        metadata: {
          pillar,
        },
      });
    }
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'assetsRegistry.getCategoriesByPillar',
      error,
      metadata: {
        pillar,
      },
    });
    throw new Error('Failed to load categories.');
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assetsRegistry.getCategoriesByPillar',
      startTime: actionTimer,
      metadata: {
        pillar,
      },
    });
  }
}

export async function getAssetsByPillar(input: AssetsGridQueryInput) {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser || !canManageAssets(currentUser.role)) {
    throw new Error(
      'Forbidden: You do not have permission to read asset registry data.'
    );
  }

  const pillar = normalizePillar(input.pillar);
  if (!pillar) {
    throw new Error('Invalid pillar value.');
  }

  const normalizedStatus = normalizeAssetStatus(input.status);
  const normalizedFilters: AssetRegistryFilters = {
    pillar,
    query: normalizeQuery(input.query),
    categoryId: normalizeCategoryId(input.categoryId),
    status: normalizedStatus,
    page: normalizePage(input.page, DEFAULT_PAGE),
    pageSize: normalizePageSize(input.pageSize),
  };

  try {
    const queryTimer = startLatencyTimer();
    try {
      return await getAssetsByPillarRepo(normalizedFilters);
    } finally {
      logLatency({
        scope: 'DB ACTION',
        label: 'assetsRegistry.getAssetsByPillar.query',
        startTime: queryTimer,
        metadata: {
          pillar: normalizedFilters.pillar,
          hasQuery: Boolean(normalizedFilters.query),
          hasCategoryId: Boolean(normalizedFilters.categoryId),
          hasStatus: Boolean(normalizedFilters.status),
          page: normalizedFilters.page,
          pageSize: normalizedFilters.pageSize,
        },
      });
    }
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'assetsRegistry.getAssetsByPillar',
      error,
      metadata: {
        pillar: normalizedFilters.pillar,
      },
    });
    throw new Error('Failed to load asset registry data.');
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assetsRegistry.getAssetsByPillar',
      startTime: actionTimer,
      metadata: {
        pillar: normalizedFilters.pillar,
      },
    });
  }
}

export async function getAllAssetsUnified(input: AssetsGridQueryInput) {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser || !canManageAssets(currentUser.role)) {
    throw new Error(
      'Forbidden: You do not have permission to read asset registry data.'
    );
  }

  const normalizedFilters: UnifiedRegistryFilters = {
    pillar: normalizePillar(input.pillar) ?? undefined,
    query: normalizeQuery(input.query),
    status: typeof input.status === 'string' ? input.status : undefined,
    page: normalizePage(input.page, DEFAULT_PAGE),
    pageSize: normalizePageSize(input.pageSize),
  };

  try {
    const queryTimer = startLatencyTimer();
    try {
      return await getAllAssetsUnifiedRepo(normalizedFilters);
    } finally {
      logLatency({
        scope: 'DB ACTION',
        label: 'assetsRegistry.getAllAssetsUnified.query',
        startTime: queryTimer,
        metadata: {
          hasPillar: Boolean(normalizedFilters.pillar),
          hasQuery: Boolean(normalizedFilters.query),
          hasStatus: Boolean(normalizedFilters.status),
          page: normalizedFilters.page,
          pageSize: normalizedFilters.pageSize,
        },
      });
    }
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'assetsRegistry.getAllAssetsUnified',
      error,
      metadata: {
        hasPillar: Boolean(normalizedFilters.pillar),
      },
    });
    throw new Error('Failed to load unified asset registry data.');
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assetsRegistry.getAllAssetsUnified',
      startTime: actionTimer,
      metadata: {
        hasPillar: Boolean(normalizedFilters.pillar),
      },
    });
  }
}

export async function bulkUpdateAssets(input: BulkUpdateAssetsInput) {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser || !canManageAssets(currentUser.role)) {
    throw new Error('Forbidden: You do not have permission to update assets.');
  }

  const normalizedAssetIds = normalizeBulkAssetIds(input.assetIds);
  if (normalizedAssetIds.length === 0) {
    return {
      success: false,
      error: 'Select at least one valid asset to update.',
    };
  }

  const normalizedUpdates = normalizeBulkUpdates(input.updates);

  const hasUpdateFields =
    normalizedUpdates.status !== undefined ||
    Object.prototype.hasOwnProperty.call(normalizedUpdates, 'locationId') ||
    Object.prototype.hasOwnProperty.call(normalizedUpdates, 'condition');

  if (!hasUpdateFields) {
    return {
      success: false,
      error: 'Provide at least one valid update field.',
    };
  }

  const normalizedActionType =
    typeof input.actionType === 'string' && input.actionType.trim().length > 0
      ? input.actionType.trim().slice(0, 100)
      : 'BULK_UPDATE';

  try {
    const updateTimer = startLatencyTimer();
    const result = await bulkUpdateAssetsRepo({
      assetIds: normalizedAssetIds,
      updates: normalizedUpdates,
      performedById: currentUser.id,
      actionType: normalizedActionType,
    });

    logLatency({
      scope: 'DB ACTION',
      label: 'assetsRegistry.bulkUpdateAssets.transaction',
      startTime: updateTimer,
      metadata: {
        requestedCount: normalizedAssetIds.length,
        updatedCount: result.updatedCount,
      },
    });

    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/software');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'assetsRegistry.bulkUpdateAssets',
      error,
      metadata: {
        requestedCount: normalizedAssetIds.length,
        actionType: normalizedActionType,
      },
    });

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update selected assets.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assetsRegistry.bulkUpdateAssets',
      startTime: actionTimer,
      metadata: {
        requestedCount: normalizedAssetIds.length,
        actionType: normalizedActionType,
      },
    });
  }
}
