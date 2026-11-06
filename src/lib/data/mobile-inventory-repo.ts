import { and, asc, count, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  assetAssignments,
  brands,
  categories,
  locations,
  models,
  softwareAllocations,
  softwareLicenses,
  users,
} from '@/db/schema';
import { readDatabase } from '@/lib/database-recovery';
import {
  containsPattern,
  parseSearchTerms,
} from '@/lib/search/omni-search-terms';
import type { InventoryQuery } from '@/lib/validations/inventory';
import {
  getAssetDetailsByResolvedId,
  getAssetHistoryByResolvedId,
  getAssetMaintenanceByResolvedId,
} from './asset-details-repo';
import { employeeAssetSpecs } from '@/lib/employee-asset-specs';
import { SOFTWARE_LICENSE_WARNING_REMAINING_PERCENT } from '@/lib/software-license-status';

// These expressions are also used for filtering, so displayed software status
// and the status filter agree. Revoked allocations do not consume a seat.
const usedSeats = sql<number>`(select count(*)::int from ${softwareAllocations} where ${softwareAllocations.licenseId} = ${softwareLicenses.id} and ${softwareAllocations.revokedAt} is null)`;
const status = sql<string>`case when ${categories.pillar} = 'Software' and ${softwareLicenses.id} is not null then
  case when ${softwareLicenses.expiryDate}::timestamp at time zone 'UTC' < now() then 'expired'
  when ${softwareLicenses.totalSeats} > 0 and ${usedSeats} >= ${softwareLicenses.totalSeats} then 'full'
  when ${softwareLicenses.expiryDate}::timestamp at time zone 'UTC' < now() + interval '30 days'
    or (${usedSeats} > 0 and ${softwareLicenses.totalSeats} - ${usedSeats} <= greatest(1, ceil(${softwareLicenses.totalSeats} * ${SOFTWARE_LICENSE_WARNING_REMAINING_PERCENT}::numeric / 100))) then 'warning'
  else 'available' end else ${assets.status} end`;

export async function getMobileInventory(filters: InventoryQuery) {
  const visible = and(
    eq(assets.isArchived, false),
    eq(categories.isActive, true)
  );
  const matching = and(
    visible,
    filters.pillar ? eq(categories.pillar, filters.pillar) : undefined,
    filters.categoryId ? eq(categories.id, filters.categoryId) : undefined,
    filters.locationId ? eq(locations.id, filters.locationId) : undefined,
    filters.status
      ? sql`lower(${status}) = lower(${filters.status})`
      : undefined,
    ...parseSearchTerms(filters.query).map((term) =>
      or(
        ilike(assets.assetTag, containsPattern(term)),
        ilike(assets.name, containsPattern(term)),
        ilike(assets.serialNumber, containsPattern(term)),
        ilike(models.name, containsPattern(term)),
        ilike(brands.name, containsPattern(term)),
        ilike(categories.name, containsPattern(term)),
        ilike(locations.name, containsPattern(term))
      )
    )
  );
  return readDatabase(async () => {
    const [data, [totals], facets] = await Promise.all([
      db
        .select({
          id: assets.id,
          assetTag: assets.assetTag,
          name: assets.name,
          serialNumber: assets.serialNumber,
          status,
          condition: assets.condition,
          model: models.name,
          brand: brands.name,
          imageUrl: models.imageUrl,
          category: categories.name,
          pillar: categories.pillar,
          location: locations.name,
          assignedTo: sql<
            string | null
          >`(select ${users.name} from ${assetAssignments}
          left join ${users} on ${users.id} = ${assetAssignments.assignedToUserId}
          where ${assetAssignments.assetId} = ${assets.id} and ${assetAssignments.returnedDate} is null
          order by ${assetAssignments.assignedDate} desc, ${assetAssignments.id} desc limit 1)`,
        })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(brands, eq(models.brandId, brands.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(locations, eq(assets.locationId, locations.id))
        .leftJoin(softwareLicenses, eq(softwareLicenses.assetId, assets.id))
        .where(matching)
        .orderBy(asc(assets.assetTag), asc(assets.id))
        .limit(filters.pageSize)
        .offset((filters.page - 1) * filters.pageSize),
      db
        .select({ total: count() })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(brands, eq(models.brandId, brands.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(locations, eq(assets.locationId, locations.id))
        .leftJoin(softwareLicenses, eq(softwareLicenses.assetId, assets.id))
        .where(matching),
      db
        .selectDistinct({
          categoryId: categories.id,
          category: categories.name,
          pillar: categories.pillar,
          locationId: locations.id,
          location: locations.name,
          status,
        })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(locations, eq(assets.locationId, locations.id))
        .leftJoin(softwareLicenses, eq(softwareLicenses.assetId, assets.id))
        .where(visible),
    ]);
    const total = totals?.total ?? 0;
    const categoryOptions = new Map(
      facets.map((row) => [
        row.categoryId,
        { id: row.categoryId, name: row.category, pillar: row.pillar },
      ])
    );
    const locationOptions = new Map(
      facets
        .filter((row) => row.locationId != null && row.location != null)
        .map((row) => [
          row.locationId!,
          { id: row.locationId!, name: row.location! },
        ])
    );
    return {
      data,
      meta: {
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil(total / filters.pageSize),
      },
      filters: {
        categories: [...categoryOptions.values()].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
        locations: [...locationOptions.values()].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
        statuses: [
          ...new Set(
            facets.map(
              (row) => row.status.charAt(0).toUpperCase() + row.status.slice(1)
            )
          ),
        ].sort(),
      },
    };
  });
}

/** Explicit operational payload: no prices, invoices, credentials or raw audit values. */
export async function getMobileAssetProfile(id: string) {
  return readDatabase(async () => {
    const details = await getAssetDetailsByResolvedId(id);
    if (!details) return null;
    const [history, maintenance] = await Promise.all([
      getAssetHistoryByResolvedId(id),
      getAssetMaintenanceByResolvedId(id),
    ]);
    const { asset, model, assignment, softwareLicense } = details;
    return {
      asset: {
        id: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        serialNumber: asset.serialNumber,
        status: asset.status,
        condition: asset.condition,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      },
      model: {
        id: model.id,
        name: model.name,
        imageUrl: model.imageUrl,
        brand: model.brand,
        category: {
          id: model.category.id,
          name: model.category.name,
          pillar: model.category.pillar,
        },
      },
      specifications: {
        ...employeeAssetSpecs(model.technicalDetails),
        ...employeeAssetSpecs(asset.instanceAttributes),
      },
      location: details.location,
      owner: details.owner,
      warrantyExpiry: details.purchase?.warrantyExpiry ?? null,
      assignment: assignment
        ? {
            assignedToUser: assignment.assignedToUser,
            assignedToLocation: assignment.assignedToLocation,
            assignedDate: assignment.assignedDate,
            expectedReturnDate: assignment.expectedReturnDate,
            state: assignment.state,
          }
        : null,
      softwareLicense: softwareLicense
        ? {
            licenseType: softwareLicense.licenseType,
            totalSeats: softwareLicense.totalSeats,
            availableSeats: softwareLicense.availableSeats,
            startDate: softwareLicense.startDate,
            expiryDate: softwareLicense.expiryDate,
          }
        : null,
      history,
      maintenance: maintenance.map((item) => ({
        id: item.id,
        status: item.status,
        reportedIssue: item.reportedIssue,
        vendorName: item.vendorName,
        estimatedReturnDate: item.estimatedReturnDate,
        actualCompletionDate: item.actualCompletionDate,
        createdAt: item.createdAt,
      })),
    };
  });
}
