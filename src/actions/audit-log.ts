'use server';

import { db } from '@/db';
import {
  assetAssignments,
  assets,
  brands,
  categories,
  departments,
  locations,
  models,
  owners,
  systemAuditLogs,
  users,
  vendors,
  reportTemplates,
} from '@/db/schema';
import { eq, ilike, or, and, desc, ne, sql, not, inArray } from 'drizzle-orm';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { getAuthenticatedUser, enforceActionAccess } from '@/actions/auth';
import { canManageAssets, canViewAssetRegistry } from '@/lib/auth/roles';
import { extractLabelFromValues } from '@/lib/audit';
import { auditLogQuerySchema } from '@/lib/validations/audit-log';

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
  // Match audit rows against the resolved entity record, not just raw IDs.
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

export async function resolveAuditValueLabels(
  records: Array<{ oldValue: unknown; newValue: unknown }>
) {
  const currentUser = await getAuthenticatedUser();
  if (
    !currentUser ||
    (currentUser.role !== 'GlobalAdmin' &&
      currentUser.role !== 'FinancialAuditor' &&
      !canManageAssets(currentUser.role))
  ) {
    throw new Error('Unauthorized access to audit metadata.');
  }

  const labels = new Map<string, string>();

  // 1. Identify all ID fields we want to resolve
  const idMappings: Record<string, string> = {
    locationId: 'locations',
    location_id: 'locations',
    ownerId: 'owners',
    owner_id: 'owners',
    categoryId: 'asset-categories',
    category_id: 'asset-categories',
    brandId: 'brands',
    brand_id: 'brands',
    modelId: 'device-models',
    model_id: 'device-models',
    vendorId: 'vendors',
    vendor_id: 'vendors',
    assignedToId: 'users',
    assigned_to_id: 'users',
    assignedToUserId: 'users',
    assigned_to_user_id: 'users',
    assignedToLocationId: 'locations',
    assigned_to_location_id: 'locations',
    assignedById: 'users',
    assigned_by_id: 'users',
    requestedById: 'users',
    requested_by_id: 'users',
    approvedById: 'users',
    approved_by_id: 'users',
    dispatchedById: 'users',
    dispatched_by_id: 'users',
    userId: 'users',
    user_id: 'users',
    performedById: 'users',
    performed_by_id: 'users',
    createdById: 'users',
    created_by_id: 'users',
    updatedById: 'users',
    updated_by_id: 'users',
    assetId: 'Asset',
    asset_id: 'Asset',
    departmentId: 'departments',
    department_id: 'departments',
  };

  // 2. Collect all IDs by entity type
  const collectedIds: Record<string, Set<string | number>> = {
    Asset: new Set(),
    users: new Set(),
    locations: new Set(),
    'asset-categories': new Set(),
    brands: new Set(),
    'device-models': new Set(),
    vendors: new Set(),
    owners: new Set(),
    departments: new Set(),
  };

  const processRecord = (obj: unknown) => {
    if (!obj || typeof obj !== 'object') return;
    const safeObj = obj as Record<string, unknown>;
    for (const [key, value] of Object.entries(safeObj)) {
      const entityType = idMappings[key];
      if (entityType && value) {
        if (entityType === 'Asset' || entityType === 'users') {
          collectedIds[entityType]?.add(String(value));
        } else {
          const num = Number(value);
          if (Number.isFinite(num)) {
            collectedIds[entityType]?.add(num);
          }
        }
      }
    }
  };

  for (const record of records) {
    processRecord(record.oldValue);
    processRecord(record.newValue);
  }

  // 3. Resolve labels in bulk
  const [
    assetRows,
    userRows,
    locationRows,
    categoryRows,
    brandRows,
    modelRows,
    vendorRows,
    ownerRows,
    departmentRows,
  ] = await Promise.all([
    collectedIds.Asset.size > 0
      ? db
          .select({
            id: assets.id,
            assetTag: assets.assetTag,
            name: assets.name,
          })
          .from(assets)
          .where(inArray(assets.id, Array.from(collectedIds.Asset) as string[]))
      : Promise.resolve([]),
    collectedIds.users.size > 0
      ? db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, Array.from(collectedIds.users) as string[]))
      : Promise.resolve([]),
    collectedIds.locations.size > 0
      ? db
          .select({
            id: locations.id,
            code: locations.locationCode,
            name: locations.name,
          })
          .from(locations)
          .where(
            inArray(
              locations.id,
              Array.from(collectedIds.locations) as number[]
            )
          )
      : Promise.resolve([]),
    collectedIds['asset-categories'].size > 0
      ? db
          .select({
            id: categories.id,
            code: categories.categoryCode,
            name: categories.name,
          })
          .from(categories)
          .where(
            inArray(
              categories.id,
              Array.from(collectedIds['asset-categories']) as number[]
            )
          )
      : Promise.resolve([]),
    collectedIds.brands.size > 0
      ? db
          .select({ id: brands.id, code: brands.brandCode, name: brands.name })
          .from(brands)
          .where(
            inArray(brands.id, Array.from(collectedIds.brands) as number[])
          )
      : Promise.resolve([]),
    collectedIds['device-models'].size > 0
      ? db
          .select({ id: models.id, code: models.modelCode, name: models.name })
          .from(models)
          .where(
            inArray(
              models.id,
              Array.from(collectedIds['device-models']) as number[]
            )
          )
      : Promise.resolve([]),
    collectedIds.vendors.size > 0
      ? db
          .select({
            id: vendors.id,
            code: vendors.vendorCode,
            name: vendors.companyName,
          })
          .from(vendors)
          .where(
            inArray(vendors.id, Array.from(collectedIds.vendors) as number[])
          )
      : Promise.resolve([]),
    collectedIds.owners.size > 0
      ? db
          .select({
            id: owners.id,
            code: owners.ownerCode,
            name: owners.companyName,
          })
          .from(owners)
          .where(
            inArray(owners.id, Array.from(collectedIds.owners) as number[])
          )
      : Promise.resolve([]),
    collectedIds.departments.size > 0
      ? db
          .select({
            id: departments.id,
            code: departments.departmentCode,
            name: departments.name,
          })
          .from(departments)
          .where(
            inArray(
              departments.id,
              Array.from(collectedIds.departments) as number[]
            )
          )
      : Promise.resolve([]),
  ]);

  const addLabel = (type: string, id: string | number, label: string) => {
    labels.set(`${type}::${id}`, label);
  };

  for (const row of assetRows)
    addLabel('Asset', row.id, formatEntityLabel(row.assetTag, row.name));
  for (const row of userRows)
    addLabel(
      'users',
      row.id,
      row.name && row.email
        ? `${row.name} <${row.email}>`
        : (row.name ?? row.email ?? '')
    );
  for (const row of locationRows)
    addLabel('locations', row.id, formatEntityLabel(row.code, row.name));
  for (const row of categoryRows)
    addLabel('asset-categories', row.id, formatEntityLabel(row.code, row.name));
  for (const row of brandRows)
    addLabel('brands', row.id, formatEntityLabel(row.code, row.name));
  for (const row of modelRows)
    addLabel('device-models', row.id, formatEntityLabel(row.code, row.name));
  for (const row of vendorRows)
    addLabel('vendors', row.id, formatEntityLabel(row.code, row.name));
  for (const row of ownerRows)
    addLabel('owners', row.id, formatEntityLabel(row.code, row.name));
  for (const row of departmentRows)
    addLabel('departments', row.id, formatEntityLabel(row.code, row.name));

  return { labels, idMappings };
}

export async function resolveTargetEntityLabels(
  records: Array<{ entityType: string; entityId: string }>
) {
  const currentUser = await getAuthenticatedUser();
  if (
    !currentUser ||
    (currentUser.role !== 'GlobalAdmin' &&
      currentUser.role !== 'FinancialAuditor' &&
      !canManageAssets(currentUser.role))
  ) {
    throw new Error('Unauthorized access to audit metadata.');
  }

  const labels = new Map<string, string>();
  const addLabel = (entityType: string, entityId: string, label: string) => {
    if (label.trim().length > 0) {
      labels.set(`${entityType}::${entityId}`, label);
    }
  };

  // Group IDs by entity table so we can resolve labels in bulk.
  const assetIds = records
    .filter((record) => record.entityType === 'Asset')
    .map((record) => record.entityId)
    .filter((entityId) => entityId.trim().length > 0);

  const userIds = records
    .filter((record) => record.entityType === 'users')
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
    'report-template': records
      .filter((record) => record.entityType === 'report-template')
      .map((record) => Number(record.entityId))
      .filter((value) => Number.isFinite(value)),
  } as const;

  // Pull the human-readable labels once, then stitch them back onto the rows.
  const [
    assetRows,
    userRows,
    locationRows,
    categoryRows,
    brandRows,
    modelRows,
    vendorRows,
    ownerRows,
    departmentRows,
    reportTemplateRows,
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
    numericEntityIds['report-template'].length > 0
      ? db
          .select({
            id: reportTemplates.id,
            code: reportTemplates.reportCode,
            name: reportTemplates.name,
          })
          .from(reportTemplates)
          .where(
            inArray(reportTemplates.id, numericEntityIds['report-template'])
          )
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

  for (const row of reportTemplateRows) {
    addLabel(
      'report-template',
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
        currentUser.role !== 'FinancialAuditor')
    ) {
      throw new Error('Unauthorized access to audit logs.');
    }

    // Validate and coerce params through schema
    const parsedParams = auditLogQuerySchema.safeParse(params);
    if (!parsedParams.success) {
      throw new Error('Invalid query parameters.');
    }

    const page = parsedParams.data.page;
    const pageSize = parsedParams.data.pageSize;
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

    const records = await db
      .select({
        totalCount: sql<number>`count(*) over()::int`,
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

    let total = records[0]?.totalCount ?? 0;
    if (records.length === 0 && page > 1) {
      const totalRowsCount = await db
        .select({ total: sql<number>`cast(count(*) as integer)` })
        .from(systemAuditLogs)
        .leftJoin(users, eq(systemAuditLogs.performedById, users.id))
        .where(whereCondition);
      total = totalRowsCount[0]?.total ?? 0;
    }
    const totalPages = Math.ceil(total / pageSize);

    // Resolve display labels after the page query so the list stays readable.
    const [targetEntityLabels, { labels: valueLabels, idMappings }] =
      await Promise.all([
        resolveTargetEntityLabels(records),
        resolveAuditValueLabels(records),
      ]);

    const data: AuditLogRow[] = records.map((record) => {
      const oldValue = record.oldValue as Record<string, unknown> | null;
      const newValue = record.newValue as Record<string, unknown> | null;

      const humanize = (obj: Record<string, unknown> | null) => {
        if (!obj) return null;
        const newObj = { ...obj };
        for (const [key, value] of Object.entries(newObj)) {
          const entityType = idMappings[key];
          if (entityType && value) {
            const label = valueLabels.get(`${entityType}::${value}`);
            if (label) newObj[key] = label;
          }
        }
        return newObj;
      };

      return {
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
        oldValue: humanize(oldValue),
        newValue: humanize(newValue),
        ipAddress: record.ipAddress,
        entityLabel:
          targetEntityLabels.get(`${record.entityType}::${record.entityId}`) ??
          extractLabelFromValues(oldValue, newValue) ??
          (record.entityType === 'URL'
            ? record.entityId
            : humanizeEntityType(record.entityType)),
      };
    });

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

/**
 * Everything that belongs on one asset's history.
 *
 * Assignment events are logged against the assignment rather than the asset —
 * `entityType: 'asset_assignment'`, with the assignment id as `entityId` — so
 * matching only on 'Asset' showed an assignment being created but never its
 * acceptance, decline, cancellation or return.
 */
function assetHistoryCondition(assetId: string) {
  return or(
    and(
      eq(systemAuditLogs.entityType, 'Asset'),
      eq(systemAuditLogs.entityId, assetId)
    ),
    and(
      eq(systemAuditLogs.entityType, 'asset_assignment'),
      // Raw fragment rather than a nested `db.select()`: this stays one
      // statement, and the query builder is not invoked a second time.
      sql`${systemAuditLogs.entityId} IN (
        SELECT ${assetAssignments.id}::text
        FROM ${assetAssignments}
        WHERE ${assetAssignments.assetId} = ${assetId}
      )`
    )
  );
}

export async function getAssetAuditHistory(
  assetId: string,
  page: number = 1,
  pageSize: number = 15
): Promise<{ data: AuditLogRow[]; hasMore: boolean }> {
  const timer = startLatencyTimer();

  try {
    await enforceActionAccess(canViewAssetRegistry);

    // Keep paging bounded so history requests stay predictable.
    const validatedPage = Math.max(1, page);
    const validatedPageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (validatedPage - 1) * validatedPageSize;
    // Fetch one extra record to determine if there is a next page
    const limit = validatedPageSize + 1;

    const whereCondition = assetHistoryCondition(assetId);

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
      .limit(limit)
      .offset(offset);

    const hasMore = records.length > validatedPageSize;
    const pageRecords = hasMore ? records.slice(0, validatedPageSize) : records;

    // Reuse the same label resolver as the system audit log.
    const targetEntityLabels = await resolveTargetEntityLabels(pageRecords);
    const { labels: valueLabels, idMappings } =
      await resolveAuditValueLabels(pageRecords);

    const data: AuditLogRow[] = pageRecords.map((record) => {
      const oldValue = record.oldValue as Record<string, unknown> | null;
      const newValue = record.newValue as Record<string, unknown> | null;

      const humanize = (obj: Record<string, unknown> | null) => {
        if (!obj) return null;
        const newObj = { ...obj };
        for (const [key, value] of Object.entries(newObj)) {
          const entityType = idMappings[key];
          if (entityType && value) {
            const label = valueLabels.get(`${entityType}::${value}`);
            if (label) newObj[key] = label;
          }
        }
        return newObj;
      };

      return {
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
        oldValue: humanize(oldValue),
        newValue: humanize(newValue),
        ipAddress: record.ipAddress,
        entityLabel:
          targetEntityLabels.get(`${record.entityType}::${record.entityId}`) ??
          extractLabelFromValues(oldValue, newValue) ??
          humanizeEntityType(record.entityType),
      };
    });

    logLatency({
      scope: 'audit-log',
      label: 'getAssetAuditHistory',
      startTime: timer,
    });

    return { data, hasMore };
  } catch (error) {
    logError({
      scope: 'audit-log',
      label: 'Database query failed in getAssetAuditHistory',
      error,
    });
    throw new Error('Failed to fetch asset history.');
  }
}

export async function getAllAssetAuditHistory(
  assetId: string
): Promise<AuditLogRow[]> {
  const timer = startLatencyTimer();

  try {
    await enforceActionAccess(canViewAssetRegistry);

    const whereCondition = assetHistoryCondition(assetId);

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
      .orderBy(desc(systemAuditLogs.performedAt), desc(systemAuditLogs.id));

    const targetEntityLabels = await resolveTargetEntityLabels(records);
    const { labels: valueLabels, idMappings } =
      await resolveAuditValueLabels(records);

    const data: AuditLogRow[] = records.map((record) => {
      const oldValue = record.oldValue as Record<string, unknown> | null;
      const newValue = record.newValue as Record<string, unknown> | null;

      const humanize = (obj: Record<string, unknown> | null) => {
        if (!obj) return null;
        const newObj = { ...obj };
        for (const [key, value] of Object.entries(newObj)) {
          const entityType = idMappings[key];
          if (entityType && value) {
            const label = valueLabels.get(`${entityType}::${value}`);
            if (label) newObj[key] = label;
          }
        }
        return newObj;
      };

      return {
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
        oldValue: humanize(oldValue),
        newValue: humanize(newValue),
        ipAddress: record.ipAddress,
        entityLabel:
          targetEntityLabels.get(`${record.entityType}::${record.entityId}`) ??
          extractLabelFromValues(oldValue, newValue) ??
          humanizeEntityType(record.entityType),
      };
    });

    logLatency({
      scope: 'audit-log',
      label: 'getAllAssetAuditHistory',
      startTime: timer,
    });

    return data;
  } catch (error) {
    logError({
      scope: 'audit-log',
      label: 'Database query failed in getAllAssetAuditHistory',
      error,
    });
    throw new Error('Failed to fetch all asset history.');
  }
}
