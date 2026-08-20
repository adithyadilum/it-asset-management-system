'use server';

import { db } from '@/db';
import { assetAssignments, systemAuditLogs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';

export interface RecentActivity {
  id: number;
  action: string;
  assetId: number | null;
  timestamp: Date;
  status: string | null;
}

export interface AdminMobileMetrics {
  assignedAssetCount: number;
  pendingApprovalsCount: number;
  recentActivities: RecentActivity[];
}

export async function getAdminMobileMetrics(): Promise<AdminMobileMetrics> {
  const user = await getAuthenticatedUser();

  if (!user || !canManageAssets(user.role)) {
    throw new Error('Unauthorized access');
  }

  // Aggregate Metrics in parallel
  const [assignedAssetsResult, pendingApprovalsResult, recentActivitiesResult] =
    await Promise.all([
      // 1. Total number of assets assigned to the authenticated user
      db
        .select({ count: assetAssignments.id })
        .from(assetAssignments)
        .where(
          and(
            eq(assetAssignments.assignedToUserId, user.id),
            eq(assetAssignments.state, 'assigned')
          )
        ),

      // 2. Count of requests awaiting approval (for any admin)
      db
        .select({ count: assetAssignments.id })
        .from(assetAssignments)
        .where(eq(assetAssignments.state, 'pending approval')),

      // 3. Last 5 logs/activities relevant to asset handling
      db
        .select({
          id: systemAuditLogs.id,
          action: systemAuditLogs.actionType,
          assetId: systemAuditLogs.entityId,
          timestamp: systemAuditLogs.performedAt,
        })
        .from(systemAuditLogs)
        .where(eq(systemAuditLogs.entityType, 'Asset'))
        .orderBy(desc(systemAuditLogs.performedAt))
        .limit(5),
    ]);

  // Process recent activities to fit the expected type
  const recentActivities: RecentActivity[] = recentActivitiesResult.map(
    (log) => ({
      id: log.id,
      action: log.action,
      assetId: log.assetId ? Number(log.assetId) : null,
      timestamp: log.timestamp,
      status: null,
    })
  );

  return {
    assignedAssetCount: assignedAssetsResult.length,
    pendingApprovalsCount: pendingApprovalsResult.length,
    recentActivities,
  };
}
