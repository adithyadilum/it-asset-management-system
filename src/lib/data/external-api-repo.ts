import { and, asc, eq, isNull, sql, type SQL } from 'drizzle-orm'

import { db } from '@/db'
import {
  assetAssignments,
  assets,
  brands,
  categories,
  departments,
  locations,
  models,
  owners,
  users,
} from '@/db/schema'
import { isValidUuid } from '@/lib/auth/uuid'

export type ExternalApiFilters = {
  status?: string
  pillar?: string
  locationId?: number
  categoryId?: number
}

export type ExternalApiPagination = {
  limit: number
  offset: number
}

export type ExternalApiAsset = {
  id: string
  assetTag: string
  serialNumber: string | null
  name: string | null
  status: string
  condition: string | null
  category: { id: number; name: string; pillar: string }
  brand: { id: number; name: string }
  model: { id: number; name: string }
  location: { id: number; name: string } | null
  owner: { id: number; companyName: string } | null
  createdAt: Date
  updatedAt: Date
}

export type ExternalApiEmployeeAssets = {
  employee: {
    id: string
    name: string
    email: string
    department: string | null
  }
  assets: ExternalApiAsset[]
}

function buildAssetFilters(filters: ExternalApiFilters) {
  const conditions: SQL[] = []

  if (filters.status) {
    conditions.push(eq(assets.status, filters.status))
  }

  if (filters.pillar) {
    conditions.push(sql<boolean>`${categories.pillar} = ${filters.pillar}`)
  }

  if (typeof filters.locationId === 'number') {
    conditions.push(eq(assets.locationId, filters.locationId))
  }

  if (typeof filters.categoryId === 'number') {
    conditions.push(eq(models.categoryId, filters.categoryId))
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

function mapAssetRow(row: {
  assetId: string
  assetTag: string
  serialNumber: string | null
  assetName: string | null
  status: string
  condition: string | null
  categoryId: number
  categoryName: string
  categoryPillar: string
  brandId: number
  brandName: string
  modelId: number
  modelName: string
  locationId: number | null
  locationName: string | null
  ownerId: number | null
  ownerCompanyName: string | null
  createdAt: Date
  updatedAt: Date
}): ExternalApiAsset {
  return {
    id: row.assetId,
    assetTag: row.assetTag,
    serialNumber: row.serialNumber,
    name: row.assetName,
    status: row.status,
    condition: row.condition,
    category: {
      id: row.categoryId,
      name: row.categoryName,
      pillar: row.categoryPillar,
    },
    brand: {
      id: row.brandId,
      name: row.brandName,
    },
    model: {
      id: row.modelId,
      name: row.modelName,
    },
    location: row.locationId
      ? { id: row.locationId, name: row.locationName ?? '' }
      : null,
    owner: row.ownerId
      ? { id: row.ownerId, companyName: row.ownerCompanyName ?? '' }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getAssetsForExternalApi(
  filters: ExternalApiFilters,
  pagination: ExternalApiPagination
): Promise<ExternalApiAsset[]> {
  const whereClause = buildAssetFilters(filters)

  const rows = await db
    .select({
      assetId: assets.id,
      assetTag: assets.assetTag,
      serialNumber: assets.serialNumber,
      assetName: assets.name,
      status: assets.status,
      condition: assets.condition,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryPillar: categories.pillar,
      brandId: brands.id,
      brandName: brands.name,
      modelId: models.id,
      modelName: models.name,
      locationId: locations.id,
      locationName: locations.name,
      ownerId: owners.id,
      ownerCompanyName: owners.companyName,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .leftJoin(owners, eq(assets.ownerId, owners.id))
    .where(whereClause ?? sql`true`)
    .orderBy(asc(assets.assetTag))
    .limit(pagination.limit)
    .offset(pagination.offset)

  return rows.map(mapAssetRow)
}

export async function countAssetsForExternalApi(filters: ExternalApiFilters): Promise<number> {
  const whereClause = buildAssetFilters(filters)

  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assets)
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .leftJoin(owners, eq(assets.ownerId, owners.id))
    .where(whereClause ?? sql`true`)

  return rows[0]?.count ?? 0
}

export async function getAssetsByEmployeeId(employeeId: string): Promise<ExternalApiEmployeeAssets | null> {
  if (!isValidUuid(employeeId)) {
    return null
  }

  const employeeRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      department: departments.name,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.id, employeeId))
    .limit(1)

  const employee = employeeRows[0]
  if (!employee) {
    return null
  }

  const rows = await db
    .select({
      assetId: assets.id,
      assetTag: assets.assetTag,
      serialNumber: assets.serialNumber,
      assetName: assets.name,
      status: assets.status,
      condition: assets.condition,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryPillar: categories.pillar,
      brandId: brands.id,
      brandName: brands.name,
      modelId: models.id,
      modelName: models.name,
      locationId: locations.id,
      locationName: locations.name,
      ownerId: owners.id,
      ownerCompanyName: owners.companyName,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .leftJoin(owners, eq(assets.ownerId, owners.id))
    .where(
      and(
        eq(assetAssignments.assignedToUserId, employeeId),
        isNull(assetAssignments.returnedDate)
      )
    )
    .orderBy(asc(assets.assetTag))

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      department: employee.department ?? null,
    },
    assets: rows.map(mapAssetRow),
  }
}
