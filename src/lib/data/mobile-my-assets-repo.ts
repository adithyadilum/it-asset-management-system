import { db } from '@/db';
import {
  assets,
  assetAssignments,
  categories,
  locations,
  models,
  users,
  brands,
  softwareAllocations,
  softwareLicenses,
} from '@/db/schema';
import { eq, and, isNull, inArray, desc, or, ne } from 'drizzle-orm';
import { readDatabase } from '@/lib/database-recovery';

function mapStatus(status: string): string {
  switch (status) {
    case 'Assigned':
      return 'assigned';
    case 'In Repair':
      return 'repair';
    case 'Lost':
      return 'lost';
    case 'Disposed':
      return 'disposed';
    case 'Available':
    case 'New':
      return 'new';
    default:
      return status.toLowerCase().replace(/\s+/g, '_');
  }
}

/** Only select employee-visible fields; never load licence keys or cost data. */
async function getOwnedSoftware(userId: string) {
  const rows = await db
    .select({
      allocationId: softwareAllocations.id,
      assetId: assets.id,
      tagId: assets.assetTag,
      name: models.name,
      brand: brands.name,
      category: categories.name,
      imageUrl: models.imageUrl,
      allocatedDate: softwareAllocations.allocatedAt,
      licenseType: softwareLicenses.licenseType,
      expiryDate: softwareLicenses.expiryDate,
    })
    .from(softwareAllocations)
    .innerJoin(
      softwareLicenses,
      eq(softwareAllocations.licenseId, softwareLicenses.id)
    )
    .innerJoin(models, eq(softwareLicenses.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .leftJoin(assets, eq(softwareLicenses.assetId, assets.id))
    .where(
      and(
        eq(softwareAllocations.assignedToUserId, userId),
        isNull(softwareAllocations.revokedAt),
        eq(softwareLicenses.isActive, true),
        or(
          isNull(assets.id),
          and(eq(assets.isArchived, false), ne(assets.status, 'Disposed'))
        )
      )
    )
    .orderBy(
      desc(softwareAllocations.allocatedAt),
      desc(softwareAllocations.id)
    );
  return rows.map((row) => ({
    ...row,
    allocatedDate: row.allocatedDate.toISOString(),
  }));
}

export async function getMobileMyAssets(userId: string) {
  return readDatabase(async () => {
    const [rows, software] = await Promise.all([
      db
        .select({
          // Assignment
          assignmentId: assetAssignments.id,
          assignedDate: assetAssignments.assignedDate,
          expectedReturnDate: assetAssignments.expectedReturnDate,
          state: assetAssignments.state,
          condition: assets.condition,
          // Asset
          assetId: assets.id,
          assetTag: assets.assetTag,
          assetName: assets.name,
          assetStatus: assets.status,
          serialNumber: assets.serialNumber,
          modelName: models.name,
          imageUrl: models.imageUrl,
          // Category (via model)
          categoryName: categories.name,
          pillar: categories.pillar,
          // Location
          locationName: locations.name,
          // Assigned by user
          assignedByName: users.name,
        })
        .from(assetAssignments)
        .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(locations, eq(assets.locationId, locations.id))
        .leftJoin(users, eq(assetAssignments.assignedById, users.id))
        .where(
          and(
            eq(assetAssignments.assignedToUserId, userId),
            isNull(assetAssignments.returnedDate),
            inArray(assetAssignments.state, [
              'assigned',
              'pending approval',
              'overdue',
              'requested',
            ])
          )
        ),
      getOwnedSoftware(userId),
    ]);

    const data = rows.map((row) => ({
      id: row.assetId,
      assignmentId: row.assignmentId,
      name: row.assetName ?? row.modelName ?? row.assetTag,
      tagId: row.assetTag,
      status: mapStatus(row.assetStatus),
      statusLabel: row.assetStatus,
      serialNumber: row.serialNumber ?? undefined,
      imageUrl: row.imageUrl ?? undefined,
      state: row.state,
      category: row.categoryName ?? undefined,
      pillar: row.pillar ?? undefined,
      assignedDate: row.assignedDate?.toISOString() ?? undefined,
      expectedReturnDate: row.expectedReturnDate ?? undefined,
      location: row.locationName ?? undefined,
      assignedByName: row.assignedByName ?? undefined,
      condition: row.condition ?? undefined,
    }));

    return { data, software };
  });
}
