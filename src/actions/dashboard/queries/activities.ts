import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { systemAuditLogs, users, assets } from '@/db/schema';
import { DASHBOARD_RECENT_ACTIVITIES_LIMIT } from '@/lib/constants/dashboard';
import type { RecentActivity } from '@/types/dashboard';
import { describeAuditEvent } from '@/lib/audit-events';

export async function getRecentActivitiesInternal(): Promise<RecentActivity[]> {
  const logs = await db
    .select({
      id: systemAuditLogs.id,
      entityType: systemAuditLogs.entityType,
      entityId: systemAuditLogs.entityId,
      actionType: systemAuditLogs.actionType,
      performedAt: systemAuditLogs.performedAt,
      performedByName: users.name,
    })
    .from(systemAuditLogs)
    .leftJoin(users, eq(systemAuditLogs.performedById, users.id))
    .orderBy(desc(systemAuditLogs.performedAt))
    .limit(DASHBOARD_RECENT_ACTIVITIES_LIMIT);

  // Resolve Asset Tags for 'Asset' entities
  const assetIds = logs
    .filter((l) => l.entityType === 'Asset')
    .map((l) => l.entityId);

  const assetMap = new Map<string, string>();
  if (assetIds.length > 0) {
    const assetDetails = await db
      .select({ id: assets.id, assetTag: assets.assetTag })
      .from(assets)
      .where(inArray(assets.id, assetIds));

    assetDetails.forEach((a) => assetMap.set(a.id, a.assetTag));
  }

  return logs.map((log) => {
    const performer = log.performedByName || 'System';
    // Only Asset rows have a resolved tag; for anything else a truncated UUID
    // is noise, so leave the label off and let the sentence name the entity.
    const entityLabel =
      log.entityType === 'Asset' ? (assetMap.get(log.entityId) ?? null) : null;

    const text = describeAuditEvent({
      actionType: log.actionType,
      entityType: log.entityType,
      entityLabel,
      actorName: performer,
    });

    return {
      id: log.id,
      text,
      actionType: log.actionType,
      performedBy: performer,
      performedAt: log.performedAt.toISOString(),
    };
  });
}
