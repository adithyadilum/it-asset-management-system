'use server';

import { revalidatePath } from 'next/cache';

import {
  AssignmentServiceError,
  assignMultipleAssets,
  assignSingleAsset,
  getAssignmentsDashboardData,
  type AssignAssetInput,
  type BulkAssignAssetsInput,
} from '@/lib/data/operations-assignments-repo';
import {
  canManageAssets,
  getAuthenticatedUser,
} from '@/lib/auth/get-authenticated-user';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';

export interface AssignmentActionResult {
  success: boolean;
  assignedAssetIds?: string[];
  assignedCount?: number;
  error?: string;
  code?: string;
}

function forbiddenResult(message: string): AssignmentActionResult {
  return {
    success: false,
    error: message,
    code: 'FORBIDDEN',
  };
}

function normalizeActionError(error: unknown): AssignmentActionResult {
  if (error instanceof AssignmentServiceError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }

  return {
    success: false,
    error: 'Unexpected error while processing assignment.',
    code: 'INTERNAL_ERROR',
  };
}

export async function assignAssetAction(
  input: AssignAssetInput
): Promise<AssignmentActionResult> {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return forbiddenResult('Unauthorized: Please sign in.');
  }

  if (!canManageAssets(currentUser.role)) {
    return forbiddenResult(
      'Forbidden: You do not have permission to assign assets.'
    );
  }

  try {
    const result = await assignSingleAsset(input, currentUser.id);

    revalidatePath('/operations/assignments');
    revalidatePath('/assets');

    return {
      success: true,
      assignedAssetIds: result.assignedAssetIds,
      assignedCount: result.assignedCount,
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'assignments.assignAssetAction',
      error,
      metadata: {
        assetId: input.assetId,
        assignmentType: input.assignmentType,
      },
    });

    return normalizeActionError(error);
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assignments.assignAssetAction',
      startTime: actionTimer,
    });
  }
}

export async function bulkAssignAssetsAction(
  input: BulkAssignAssetsInput
): Promise<AssignmentActionResult> {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return forbiddenResult('Unauthorized: Please sign in.');
  }

  if (!canManageAssets(currentUser.role)) {
    return forbiddenResult(
      'Forbidden: You do not have permission to assign assets.'
    );
  }

  try {
    const result = await assignMultipleAssets(input, currentUser.id);

    revalidatePath('/operations/assignments');
    revalidatePath('/assets');

    return {
      success: true,
      assignedAssetIds: result.assignedAssetIds,
      assignedCount: result.assignedCount,
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'assignments.bulkAssignAssetsAction',
      error,
      metadata: {
        assetCount: input.assetIds.length,
        assignmentType: input.assignmentType,
      },
    });

    return normalizeActionError(error);
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assignments.bulkAssignAssetsAction',
      startTime: actionTimer,
    });
  }
}

export async function getOperationsAssignmentsDataAction() {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser || !canManageAssets(currentUser.role)) {
    throw new Error(
      'Forbidden: You do not have permission to read operations assignment data.'
    );
  }

  try {
    return await getAssignmentsDashboardData();
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assignments.getOperationsAssignmentsDataAction',
      startTime: actionTimer,
    });
  }
}
