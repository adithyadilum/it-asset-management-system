import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { systemAuditLogs, users, assets } from '@/db/schema';
import { DASHBOARD_RECENT_ACTIVITIES_LIMIT } from '@/lib/constants/dashboard';
import type { RecentActivity } from '@/types/dashboard';

function formatActionType(actionType: string): string {
  const act = actionType.toLowerCase().replace(/_/g, ' ');

  if (act.endsWith('ed') || act.endsWith('d')) return act;
  if (act === 'login') return 'logged in';
  if (act === 'logout') return 'logged out';
  if (act.endsWith('e')) return `${act}d`;
  return `${act}ed`;
}

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
    const entityLabel = assetMap.get(log.entityId) || log.entityId.slice(0, 8);

    const actionPhrase = formatActionType(log.actionType);
    let text = `${performer} ${actionPhrase} ${log.entityType.toLowerCase()}`;

    if (log.entityType === 'Asset') {
      text = `${performer} ${actionPhrase} asset ${entityLabel}`;
    } else if (log.entityType === 'MaintenanceTicket') {
      text = `${performer} updated maintenance for ${entityLabel}`;
    } else if (log.actionType === 'LOGIN') {
      text = `${performer} logged into the system`;
    }

    return {
      id: log.id,
      text,
      actionType: log.actionType,
      performedBy: performer,
      performedAt: log.performedAt.toISOString(),
    };
  });
}
