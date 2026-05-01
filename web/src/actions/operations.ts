'use server';

import {
  getAssignmentsDashboardData,
  type AssignmentsDashboardData,
  type AssignmentsDashboardTab,
  type AssignmentsDashboardRow,
} from '@/lib/data/operations-assignments-repo';
import {
  canManageAssets,
  getAuthenticatedUser,
} from '@/actions/auth';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';

export interface OperationsAssignmentResult {
  success: boolean;
  data?:
    | AssignmentsDashboardData
    | { tab: AssignmentsDashboardTab; data: AssignmentsDashboardRow[] };
  error?: string;
}

function forbiddenResult(message: string): OperationsAssignmentResult {
  return {
    success: false,
    error: message,
  };
}

/**
 * Fetch operations assignments dashboard data
 * @param tab - Optional tab filter ('available', 'assigned', 'returned')
 * @returns Dashboard data for the requested tab or all tabs
 */
export async function getOperationsAssignmentsAction(
  tab?: AssignmentsDashboardTab
): Promise<OperationsAssignmentResult> {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return forbiddenResult('Unauthorized: Please sign in.');
  }

  if (!canManageAssets(currentUser.role)) {
    return forbiddenResult(
      'Forbidden: You do not have permission to read operations assignment data.'
    );
  }

  try {
    const dashboardData = await getAssignmentsDashboardData();

    // If no tab specified, return all data
    if (!tab) {
      return {
        success: true,
        data: dashboardData,
      };
    }

    // Return data for the specified tab
    if (tab === 'available') {
      return {
        success: true,
        data: {
          tab: 'available',
          data: dashboardData.available,
        },
      };
    }

    if (tab === 'assigned') {
      return {
        success: true,
        data: {
          tab: 'assigned',
          data: dashboardData.assigned,
        },
      };
    }

    if (tab === 'returned') {
      return {
        success: true,
        data: {
          tab: 'returned',
          data: dashboardData.returned,
        },
      };
    }

    return {
      success: true,
      data: dashboardData,
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'operations.getOperationsAssignmentsAction',
      error,
      metadata: { tab },
    });

    return {
      success: false,
      error: 'Unexpected error while fetching operations assignments data.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'operations.getOperationsAssignmentsAction',
      startTime: actionTimer,
    });
  }
}
