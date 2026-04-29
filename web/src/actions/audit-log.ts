'use server';

import { db } from '@/db';
import {
  assets,
  brands,
  categories,
  departments,
  locations,
  models,
  owners,
  sessions,
  systemAuditLogs,
  users,
  vendors,
} from '@/db/schema';
import { eq, ilike, or, and, desc, ne, sql, not, inArray } from 'drizzle-orm';
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

function humanizeEntityType(entityType: string) {
  return entityType
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatEntityLabel(
  code: string | null | undefined,
  name: string | null | undefined
) {
  const trimmedCode = code?.trim();
  const trimmedName = name?.trim();

  if (trimmedCode && trimmedName) {
    return `${trimmedCode} · ${trimmedName}`;
  }

  return trimmedName || trimmedCode || '';
}

function buildTargetEntitySearchCondition(searchValue: string) {
  return or(
    sql<boolean>`exists (
      select 1
      from ${assets}
      where ${systemAuditLogs.entityType} = 'Asset'
        and ${assets.id} = ${sql`${systemAuditLogs.entityId}::uuid`}
        and (
          ${assets.assetTag} ilike ${searchValue}
          or ${assets.name} ilike ${searchValue}
        )
    )`,
    sql<boolean>`exists (
      select 1
      from ${users}
      where ${systemAuditLogs.entityType} = 'users'
        and ${users.id} = ${sql`${systemAuditLogs.entityId}::uuid`}
        and (
          ${users.name} ilike ${searchValue}
          or ${users.email} ilike ${searchValue}
        )
    )`,
    sql<boolean>`exists (
      select 1
      from ${sessions}
      left join ${users} on ${sessions.userId} = ${users.id}
      where ${systemAuditLogs.entityType} = 'sessions'
        and ${sessions.tokenId} = ${systemAuditLogs.entityId}
        and (
          ${sessions.tokenId} ilike ${searchValue}
          or ${users.name} ilike ${searchValue}
          or ${users.email} ilike ${searchValue}
        )
    )`,
    sql<boolean>`exists (
      select 1
      from ${locations}
      where ${systemAuditLogs.entityType} = 'locations'
        and ${locations.id} = ${sql`${systemAuditLogs.entityId}::integer`}
        and (
          ${locations.locationCode} ilike ${searchValue}
          or ${locations.name} ilike ${searchValue}
        )
    )`,
    sql<boolean>`exists (
      select 1
      from ${categories}
      where ${systemAuditLogs.entityType} = 'asset-categories'
        and ${categories.id} = ${sql`${systemAuditLogs.entityId}::integer`}
        and (
          ${categories.categoryCode} ilike ${searchValue}
          or ${categories.name} ilike ${searchValue}
        )
    )`,
    sql<boolean>`exists (
      select 1
      from ${brands}
      where ${systemAuditLogs.entityType} = 'brands'
        and ${brands.id} = ${sql`${systemAuditLogs.entityId}::integer`}
        and (
          ${brands.brandCode} ilike ${searchValue}
          or ${brands.name} ilike ${searchValue}
        )
    )`,
    sql<boolean>`exists (
      select 1
      from ${models}
      where ${systemAuditLogs.entityType} = 'device-models'
        and ${models.id} = ${sql`${systemAuditLogs.entityId}::integer`}
        and (
          ${models.modelCode} ilike ${searchValue}
          or ${models.name} ilike ${searchValue}
        )
    )`,
    sql<boolean>`exists (
      select 1
      from ${vendors}
      where ${systemAuditLogs.entityType} = 'vendors'
        and ${vendors.id} = ${sql`${systemAuditLogs.entityId}::integer`}
        and (
          ${vendors.vendorCode} ilike ${searchValue}
          or ${vendors.companyName} ilike ${searchValue}
        )
    )`,
    sql<boolean>`exists (
      select 1
      from ${owners}
      where ${systemAuditLogs.entityType} = 'owners'
        and ${owners.id} = ${sql`${systemAuditLogs.entityId}::integer`}
        and (
          ${owners.ownerCode} ilike ${searchValue}
          or ${owners.companyName} ilike ${searchValue}
        )
    )`,
    sql<boolean>`exists (
      select 1
      from ${departments}
      where ${systemAuditLogs.entityType} = 'departments'
        and ${departments.id} = ${sql`${systemAuditLogs.entityId}::integer`}
        and (
          ${departments.departmentCode} ilike ${searchValue}
          or ${departments.name} ilike ${searchValue}
        )
    )`
  );
}

async function resolveTargetEntityLabels(
  records: Array<Pick<AuditLogRow, 'entityType' | 'entityId'>>
) {
  const labels = new Map<string, string>();
  const addLabel = (entityType: string, entityId: string, label: string) => {
    if (label.trim().length > 0) {
      labels.set(`${entityType}::${entityId}`, label);
    }
  };

  const assetIds = records
    .filter((record) => record.entityType === 'Asset')
    .map((record) => record.entityId)
    .filter((entityId) => entityId.trim().length > 0);

  const userIds = records
    .filter((record) => record.entityType === 'users')
    .map((record) => record.entityId)
    .filter((entityId) => entityId.trim().length > 0);

  const sessionTokenIds = records
    .filter((record) => record.entityType === 'sessions')
    .map((record) => record.entityId)
    .filter((entityId) => entityId.trim().length > 0);

  const numericEntityIds = {
    locations: records
      .filter((record) => record.entityType === 'locations')
      .map((record) => Number(record.entityId))
      .filter((value) => Number.isFinite(value)),
    'asset-categories': records
      .filter((record) => record.entityType === 'asset-categories')
      .map((record) => Number(record.entityId))
      .filter((value) => Number.isFinite(value)),
    brands: records
      .filter((record) => record.entityType === 'brands')
      .map((record) => Number(record.entityId))
      .filter((value) => Number.isFinite(value)),
    'device-models': records
      .filter((record) => record.entityType === 'device-models')
      .map((record) => Number(record.entityId))
      .filter((value) => Number.isFinite(value)),
    vendors: records
      .filter((record) => record.entityType === 'vendors')
      .map((record) => Number(record.entityId))
      .filter((value) => Number.isFinite(value)),
    owners: records
      .filter((record) => record.entityType === 'owners')
      .map((record) => Number(record.entityId))
      .filter((value) => Number.isFinite(value)),
    departments: records
      .filter((record) => record.entityType === 'departments')
      .map((record) => Number(record.entityId))
      .filter((value) => Number.isFinite(value)),
  } as const;

  const [
    assetRows,
    userRows,
    sessionRows,
    locationRows,
    categoryRows,
    brandRows,
    modelRows,
    vendorRows,
    ownerRows,
    departmentRows,
  ] = await Promise.all([
    assetIds.length > 0
      ? db
          .select({
            id: assets.id,
            assetTag: assets.assetTag,
            name: assets.name,
          })
          .from(assets)
          .where(inArray(assets.id, assetIds))
      : Promise.resolve([]),
    userIds.length > 0
      ? db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : Promise.resolve([]),
    sessionTokenIds.length > 0
      ? db
          .select({
            tokenId: sessions.tokenId,
            userName: users.name,
            userEmail: users.email,
          })
          .from(sessions)
          .leftJoin(users, eq(sessions.userId, users.id))
          .where(inArray(sessions.tokenId, sessionTokenIds))
      : Promise.resolve([]),
    numericEntityIds.locations.length > 0
      ? db
          .select({
            id: locations.id,
            code: locations.locationCode,
            name: locations.name,
          })
          .from(locations)
          .where(inArray(locations.id, numericEntityIds.locations))
      : Promise.resolve([]),
    numericEntityIds['asset-categories'].length > 0
      ? db
          .select({
            id: categories.id,
            code: categories.categoryCode,
            name: categories.name,
          })
          .from(categories)
          .where(inArray(categories.id, numericEntityIds['asset-categories']))
      : Promise.resolve([]),
    numericEntityIds.brands.length > 0
      ? db
          .select({
            id: brands.id,
            code: brands.brandCode,
            name: brands.name,
          })
          .from(brands)
          .where(inArray(brands.id, numericEntityIds.brands))
      : Promise.resolve([]),
    numericEntityIds['device-models'].length > 0
      ? db
          .select({
            id: models.id,
            code: models.modelCode,
            name: models.name,
          })
          .from(models)
          .where(inArray(models.id, numericEntityIds['device-models']))
      : Promise.resolve([]),
    numericEntityIds.vendors.length > 0
      ? db
          .select({
            id: vendors.id,
            code: vendors.vendorCode,
            name: vendors.companyName,
          })
          .from(vendors)
          .where(inArray(vendors.id, numericEntityIds.vendors))
      : Promise.resolve([]),
    numericEntityIds.owners.length > 0
      ? db
          .select({
            id: owners.id,
            code: owners.ownerCode,
            name: owners.companyName,
          })
          .from(owners)
          .where(inArray(owners.id, numericEntityIds.owners))
      : Promise.resolve([]),
    numericEntityIds.departments.length > 0
      ? db
          .select({
            id: departments.id,
            code: departments.departmentCode,
            name: departments.name,
          })
          .from(departments)
          .where(inArray(departments.id, numericEntityIds.departments))
      : Promise.resolve([]),
  ]);

  for (const row of assetRows) {
    addLabel('Asset', row.id, formatEntityLabel(row.assetTag, row.name));
  }

  for (const row of userRows) {
    addLabel(
      'users',
      row.id,
      row.name && row.email
        ? `${row.name} <${row.email}>`
        : (row.name ?? row.email ?? '')
    );
  }

  for (const row of sessionRows) {
    addLabel(
      'sessions',
      row.tokenId,
      row.userName && row.userEmail
        ? `Session for ${row.userName} <${row.userEmail}>`
        : (row.userName ??
            row.userEmail ??
            `Session ${row.tokenId.slice(0, 8)}`)
    );
  }

  for (const row of locationRows) {
    addLabel(
      'locations',
      String(row.id),
      formatEntityLabel(row.code, row.name)
    );
  }

  for (const row of categoryRows) {
    addLabel(
      'asset-categories',
      String(row.id),
      formatEntityLabel(row.code, row.name)
    );
  }

  for (const row of brandRows) {
    addLabel('brands', String(row.id), formatEntityLabel(row.code, row.name));
  }

  for (const row of modelRows) {
    addLabel(
      'device-models',
      String(row.id),
      formatEntityLabel(row.code, row.name)
    );
  }

  for (const row of vendorRows) {
    addLabel('vendors', String(row.id), formatEntityLabel(row.code, row.name));
  }

  for (const row of ownerRows) {
    addLabel('owners', String(row.id), formatEntityLabel(row.code, row.name));
  }

  for (const row of departmentRows) {
    addLabel(
      'departments',
      String(row.id),
      formatEntityLabel(row.code, row.name)
    );
  }

  return labels;
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
          buildTargetEntitySearchCondition(q),
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
            ilike(systemAuditLogs.entityId, q),
            buildTargetEntitySearchCondition(q)
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

    const targetEntityLabels = await resolveTargetEntityLabels(records);

    const data: AuditLogRow[] = records.map((record) => ({
      id: record.id,
      performedAt: record.performedAt,
      entityType: record.entityType,
      entityId: record.entityId,
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
      entityLabel:
        targetEntityLabels.get(`${record.entityType}::${record.entityId}`) ??
        (record.entityType === 'URL' ? record.entityId : humanizeEntityType(record.entityType)),
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
