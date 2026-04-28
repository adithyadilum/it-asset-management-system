'use server';

import { db } from '@/db';
import { systemAuditLogs, users } from '@/db/schema';
import { eq, ilike, or, and, desc, ne, sql, not } from 'drizzle-orm';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';

export interface AuditLogFilter {
  field: string;
  operator: 'is' | 'is not';
  value: string;
}

export interface GetAuditLogsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: AuditLogFilter[];
}

export interface AuditLogRow {
  id: number;
  performedAt: string | Date;
  entityType: string;
  entityId: string;
  entityLabel?: string | null;
  actionType: string;
  performedBy: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    avatarUrl?: string | null;
  } | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
}

export interface PaginatedAuditLogsResult {
  data: AuditLogRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export async function getAuditLogs(
  params: GetAuditLogsParams
): Promise<PaginatedAuditLogsResult> {
  const timer = startLatencyTimer();

  try {
    const currentUser = await getAuthenticatedUser();

    if (
      !currentUser ||
      (currentUser.role !== 'GlobalAdmin' &&
        currentUser.role !== 'FinanceAuditor')
    ) {
      throw new Error('Unauthorized access to audit logs.');
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 16));
    const offset = (page - 1) * pageSize;

    const baseWhere = [];

    if (params.search && params.search.trim().length > 0) {
      const q = `%${params.search.trim()}%`;
      baseWhere.push(
        or(
          ilike(systemAuditLogs.actionType, q),
          ilike(systemAuditLogs.entityType, q),
          ilike(systemAuditLogs.entityId, q),
          ilike(systemAuditLogs.ipAddress, q),
          sql`${systemAuditLogs.oldValue}::text ILIKE ${q}`,
          sql`${systemAuditLogs.newValue}::text ILIKE ${q}`,
          ilike(users.name, q),
          ilike(users.email, q)
        )
      );
    }

    if (params.filters && params.filters.length > 0) {
      for (const filter of params.filters) {
        const { field, operator, value } = filter;
        const q = `%${value}%`;
        const isNot = operator === 'is not';

        if (field === 'Action Taken') {
          baseWhere.push(
            isNot
              ? ne(systemAuditLogs.actionType, value)
              : eq(systemAuditLogs.actionType, value)
          );
        } else if (field === 'User') {
          const userCondition = or(ilike(users.name, q), ilike(users.email, q));
          if (userCondition)
            baseWhere.push(isNot ? not(userCondition) : userCondition);
        } else if (field === 'Target Entity') {
          const entityCondition = or(
            ilike(systemAuditLogs.entityType, q),
            ilike(systemAuditLogs.entityId, q)
          );
          if (entityCondition)
            baseWhere.push(isNot ? not(entityCondition) : entityCondition);
        } else if (field === 'IP Address') {
          const ipCondition = ilike(systemAuditLogs.ipAddress, q);
          if (ipCondition)
            baseWhere.push(isNot ? not(ipCondition) : ipCondition);
        } else if (field === 'Event Details') {
          const detailCondition = or(
            sql`${systemAuditLogs.oldValue}::text ILIKE ${q}`,
            sql`${systemAuditLogs.newValue}::text ILIKE ${q}`
          );
          if (detailCondition)
            baseWhere.push(isNot ? not(detailCondition) : detailCondition);
        }
      }
    }

    const whereCondition = baseWhere.length > 0 ? and(...baseWhere) : undefined;

    const totalRowsCount = await db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(systemAuditLogs)
      .leftJoin(users, eq(systemAuditLogs.performedById, users.id))
      .where(whereCondition);

    const total = totalRowsCount[0]?.total ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    const records = await db
      .select({
        id: systemAuditLogs.id,
        performedAt: systemAuditLogs.performedAt,
        entityType: systemAuditLogs.entityType,
        entityId: systemAuditLogs.entityId,
        actionType: systemAuditLogs.actionType,
        oldValue: systemAuditLogs.oldValue,
        newValue: systemAuditLogs.newValue,
        ipAddress: systemAuditLogs.ipAddress,
        performedById: users.id,
        performedByName: users.name,
        performedByEmail: users.email,
        performedByRole: users.role,
      })
      .from(systemAuditLogs)
      .leftJoin(users, eq(systemAuditLogs.performedById, users.id))
      .where(whereCondition)
      .orderBy(desc(systemAuditLogs.performedAt), desc(systemAuditLogs.id))
      .limit(pageSize)
      .offset(offset);

    const data: AuditLogRow[] = records.map((record) => ({
      id: record.id,
      performedAt: record.performedAt,
      entityType: record.entityType,
      entityId: record.entityId,
      entityLabel: null,
      actionType: record.actionType,
      performedBy: record.performedById
        ? {
            id: record.performedById,
            name: record.performedByName ?? 'Unknown',
            email: record.performedByEmail ?? 'unknown@example.com',
            role: record.performedByRole,
          }
        : null,
      oldValue: record.oldValue as Record<string, unknown> | null,
      newValue: record.newValue as Record<string, unknown> | null,
      ipAddress: record.ipAddress,
    }));

    logLatency({ scope: 'audit-log', label: 'getAuditLogs', startTime: timer });

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: totalPages === 0 ? 1 : totalPages,
      },
    };
  } catch (error) {
    logError({
      scope: 'audit-log',
      label: 'Database query failed in getAuditLogs',
      error,
    });
    throw new Error('Failed to fetch audit logs.');
  }
}
