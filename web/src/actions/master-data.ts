'use server';

import { eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import {
  assetAssignments,
  assets,
  assetPurchases,
  brands,
  categories,
  departments,
  locations,
  maintenanceRecords,
  models,
  owners,
  users,
  vendors,
} from '@/db/schema';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { MASTER_DATA_RECORD_ENTITIES } from '@/lib/master-data/shared';
import { uploadFileToStorage } from '@/lib/storage';
import { logAuditAction } from '@/lib/audit';
import type {
  BrandFormState,
  CategoryFormState,
  FormErrorMap,
  MasterDataRecordEntity,
  UpdateMasterDataState,
} from '@/types/master-data';
import {
  brandSchema,
  categorySchema,
  departmentSchema,
  deviceModelSchema,
  locationSchema,
  ownerSchema,
  vendorSchema,
} from '@/lib/validations/master-data';
import { type LocationType } from '@/types/master-data';

const CATEGORY_PILLARS = new Set([
  'IT & Digital',
  'Software',
  'Office Furniture',
  'Office Electronics',
]);

const MASTER_DATA_CODE_PREFIX: Record<MasterDataRecordEntity, string> = {
  locations: 'LOC',
  'asset-categories': 'CAT',
  brands: 'BRD',
  'device-models': 'MDL',
  vendors: 'VND',
  owners: 'OWN',
  departments: 'DEP',
};

function formatMasterDataCode(prefix: string, numericId: number) {
  return `${prefix}-${String(numericId).padStart(4, '0')}`;
}

function unauthorizedMasterDataResult(): UpdateMasterDataState {
  return {
    success: false,
    message: 'Forbidden: only Global Administrators can manage master data.',
  };
}

function parseBooleanFormValue(entry: FormDataEntryValue | null) {
  const value = String(entry ?? '').toLowerCase();
  return value === 'true' || value === 'on' || value === '1';
}

function parseRequiredText(
  value: FormDataEntryValue | null,
  fieldName: string,
  minimumLength = 1
) {
  const normalized = String(value ?? '').trim();

  if (normalized.length < minimumLength) {
    return {
      ok: false as const,
      error: `${fieldName} is required.`,
    };
  }

  return {
    ok: true as const,
    value: normalized,
  };
}

async function countLinkedAssetsForEntity(
  entity: MasterDataRecordEntity,
  recordIds: number[]
): Promise<number> {
  switch (entity) {
    case 'locations': {
      const linked = await db
        .select({
          count: sql<number>`coalesce(count(${assets.id}), 0)::int`,
        })
        .from(assets)
        .where(inArray(assets.locationId, recordIds));

      return linked[0]?.count ?? 0;
    }

    case 'asset-categories': {
      const linked = await db
        .select({
          count: sql<number>`coalesce(count(${assets.id}), 0)::int`,
        })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .where(inArray(models.categoryId, recordIds));

      return linked[0]?.count ?? 0;
    }

    case 'brands': {
      const linked = await db
        .select({
          count: sql<number>`coalesce(count(${assets.id}), 0)::int`,
        })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .where(inArray(models.brandId, recordIds));

      return linked[0]?.count ?? 0;
    }

    case 'device-models': {
      const linked = await db
        .select({
          count: sql<number>`coalesce(count(${assets.id}), 0)::int`,
        })
        .from(assets)
        .where(inArray(assets.modelId, recordIds));

      return linked[0]?.count ?? 0;
    }

    case 'vendors': {
      const linked = await db
        .select({
          count: sql<number>`coalesce(count(distinct ${assetPurchases.assetId}), 0)::int`,
        })
        .from(assetPurchases)
        .where(inArray(assetPurchases.vendorId, recordIds));

      return linked[0]?.count ?? 0;
    }

    case 'owners': {
      const linked = await db
        .select({
          count: sql<number>`coalesce(count(${assets.id}), 0)::int`,
        })
        .from(assets)
        .where(inArray(assets.ownerId, recordIds));

      return linked[0]?.count ?? 0;
    }

    case 'departments':
      return 0;
  }
}

async function countLinkedUsersForDepartments(
  recordIds: number[]
): Promise<number> {
  const linked = await db
    .select({
      count: sql<number>`coalesce(count(${users.id}), 0)::int`,
    })
    .from(users)
    .where(inArray(users.departmentId, recordIds));

  return linked[0]?.count ?? 0;
}

async function countChildLocations(recordIds: number[]): Promise<number> {
  const linked = await db
    .select({
      count: sql<number>`coalesce(count(${locations.id}), 0)::int`,
    })
    .from(locations)
    .where(inArray(locations.parentId, recordIds));

  return linked[0]?.count ?? 0;
}

async function countLocationAssignments(recordIds: number[]): Promise<number> {
  const linked = await db
    .select({
      count: sql<number>`coalesce(count(${assetAssignments.id}), 0)::int`,
    })
    .from(assetAssignments)
    .where(inArray(assetAssignments.assignedToLocationId, recordIds));

  return linked[0]?.count ?? 0;
}

async function countLinkedModelsForCategories(
  recordIds: number[]
): Promise<number> {
  const linked = await db
    .select({
      count: sql<number>`coalesce(count(${models.id}), 0)::int`,
    })
    .from(models)
    .where(inArray(models.categoryId, recordIds));

  return linked[0]?.count ?? 0;
}

async function countLinkedModelsForBrands(
  recordIds: number[]
): Promise<number> {
  const linked = await db
    .select({
      count: sql<number>`coalesce(count(${models.id}), 0)::int`,
    })
    .from(models)
    .where(inArray(models.brandId, recordIds));

  return linked[0]?.count ?? 0;
}

async function countVendorPurchaseReferences(
  recordIds: number[]
): Promise<number> {
  const linked = await db
    .select({
      count: sql<number>`coalesce(count(${assetPurchases.id}), 0)::int`,
    })
    .from(assetPurchases)
    .where(inArray(assetPurchases.vendorId, recordIds));

  return linked[0]?.count ?? 0;
}

async function countVendorMaintenanceReferences(
  recordIds: number[]
): Promise<number> {
  const linked = await db
    .select({
      count: sql<number>`coalesce(count(${maintenanceRecords.id}), 0)::int`,
    })
    .from(maintenanceRecords)
    .where(inArray(maintenanceRecords.vendorId, recordIds));

  return linked[0]?.count ?? 0;
}

export async function deleteMasterDataRecords(
  entityRaw: string,
  ids: number[]
): Promise<UpdateMasterDataState> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return unauthorizedMasterDataResult();
  }

  if (
    !MASTER_DATA_RECORD_ENTITIES.includes(entityRaw as MasterDataRecordEntity)
  ) {
    return {
      success: false,
      message: 'Invalid record type supplied.',
    };
  }

  const entity = entityRaw as MasterDataRecordEntity;
  const recordIds = Array.from(
    new Set(ids.filter((id) => Number.isInteger(id) && id > 0))
  );

  if (recordIds.length === 0) {
    return {
      success: false,
      message: 'No valid records were selected.',
    };
  }

  try {
    const linkedAssetCount = await countLinkedAssetsForEntity(
      entity,
      recordIds
    );

    if (linkedAssetCount > 0) {
      return {
        success: false,
        message:
          linkedAssetCount === 1
            ? 'Delete blocked: selected records include 1 linked asset.'
            : `Delete blocked: selected records include ${linkedAssetCount} linked assets.`,
      };
    }

    if (entity === 'departments') {
      const linkedUserCount = await countLinkedUsersForDepartments(recordIds);

      if (linkedUserCount > 0) {
        return {
          success: false,
          message:
            linkedUserCount === 1
              ? 'Delete blocked: selected departments are assigned to 1 user.'
              : `Delete blocked: selected departments are assigned to ${linkedUserCount} users.`,
        };
      }
    }

    if (entity === 'locations') {
      const childLocationCount = await countChildLocations(recordIds);
      if (childLocationCount > 0) {
        return {
          success: false,
          message:
            childLocationCount === 1
              ? 'Delete blocked: selected locations include 1 child location.'
              : `Delete blocked: selected locations include ${childLocationCount} child locations.`,
        };
      }

      const assignmentCount = await countLocationAssignments(recordIds);
      if (assignmentCount > 0) {
        return {
          success: false,
          message:
            assignmentCount === 1
              ? 'Delete blocked: selected locations are referenced by 1 asset assignment.'
              : `Delete blocked: selected locations are referenced by ${assignmentCount} asset assignments.`,
        };
      }
    }

    if (entity === 'asset-categories') {
      const linkedModelCount = await countLinkedModelsForCategories(recordIds);
      if (linkedModelCount > 0) {
        return {
          success: false,
          message:
            linkedModelCount === 1
              ? 'Delete blocked: selected categories are used by 1 model.'
              : `Delete blocked: selected categories are used by ${linkedModelCount} models.`,
        };
      }
    }

    if (entity === 'brands') {
      const linkedModelCount = await countLinkedModelsForBrands(recordIds);
      if (linkedModelCount > 0) {
        return {
          success: false,
          message:
            linkedModelCount === 1
              ? 'Delete blocked: selected brands are used by 1 model.'
              : `Delete blocked: selected brands are used by ${linkedModelCount} models.`,
        };
      }
    }

    if (entity === 'vendors') {
      const purchaseReferenceCount =
        await countVendorPurchaseReferences(recordIds);
      if (purchaseReferenceCount > 0) {
        return {
          success: false,
          message:
            purchaseReferenceCount === 1
              ? 'Delete blocked: selected vendors are referenced by 1 purchase record.'
              : `Delete blocked: selected vendors are referenced by ${purchaseReferenceCount} purchase records.`,
        };
      }

      const maintenanceReferenceCount =
        await countVendorMaintenanceReferences(recordIds);
      if (maintenanceReferenceCount > 0) {
        return {
          success: false,
          message:
            maintenanceReferenceCount === 1
              ? 'Delete blocked: selected vendors are referenced by 1 maintenance record.'
              : `Delete blocked: selected vendors are referenced by ${maintenanceReferenceCount} maintenance records.`,
        };
      }
    }

    let deletedCount = 0;
    let deletedRecords: { id: number }[] = [];

    switch (entity) {
      case 'locations': {
        const deleted = await db
          .delete(locations)
          .where(inArray(locations.id, recordIds))
          .returning({ id: locations.id });
        deletedRecords = deleted;
        deletedCount = deleted.length;
        break;
      }
      case 'asset-categories': {
        const deleted = await db
          .delete(categories)
          .where(inArray(categories.id, recordIds))
          .returning({ id: categories.id });
        deletedRecords = deleted;
        deletedCount = deleted.length;
        break;
      }
      case 'brands': {
        const deleted = await db
          .delete(brands)
          .where(inArray(brands.id, recordIds))
          .returning({ id: brands.id });
        deletedRecords = deleted;
        deletedCount = deleted.length;
        break;
      }
      case 'device-models': {
        const deleted = await db
          .delete(models)
          .where(inArray(models.id, recordIds))
          .returning({ id: models.id });
        deletedRecords = deleted;
        deletedCount = deleted.length;
        break;
      }
      case 'vendors': {
        const deleted = await db
          .delete(vendors)
          .where(inArray(vendors.id, recordIds))
          .returning({ id: vendors.id });
        deletedRecords = deleted;
        deletedCount = deleted.length;
        break;
      }
      case 'owners': {
        const deleted = await db
          .delete(owners)
          .where(inArray(owners.id, recordIds))
          .returning({ id: owners.id });
        deletedRecords = deleted;
        deletedCount = deleted.length;
        break;
      }
      case 'departments': {
        const deleted = await db
          .delete(departments)
          .where(inArray(departments.id, recordIds))
          .returning({ id: departments.id });
        deletedRecords = deleted;
        deletedCount = deleted.length;
        break;
      }
    }

    if (deletedCount === 0) {
      return {
        success: false,
        message: 'No records were deleted.',
      };
    }

    for (const record of deletedRecords) {
      await logAuditAction({
        entityType: entity,
        entityId: record.id.toString(),
        actionType: 'DELETE',
        performedById: currentUser.id,
      });
    }

    revalidatePath('/settings/master-data');

    return {
      success: true,
      message:
        deletedCount === 1
          ? 'Record deleted successfully.'
          : `${deletedCount} records deleted successfully.`,
    };
  } catch {
    return {
      success: false,
      message:
        'Delete blocked: one or more selected records are referenced by existing data.',
    };
  }
}

export async function createBrand(
  _prevState: BrandFormState,
  formData: FormData
): Promise<BrandFormState> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return {
      success: false,
      message: unauthorizedMasterDataResult().message,
    };
  }

  const parsed = brandSchema.safeParse({
    name: formData.get('name'),
    isActive: formData.get('isActive') === 'true',
  });

  if (!parsed.success) {
    return {
      success: false,
      message: 'Failed to validate brand data.',
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const inserted = await db
      .insert(brands)
      .values({
        name: parsed.data.name,
        isActive: parsed.data.isActive,
      })
      .returning({
        id: brands.id,
        name: brands.name,
        isActive: brands.isActive,
      });

    if (inserted.length === 0) {
      return {
        success: false,
        message: 'Failed to create brand.',
      };
    }

    await logAuditAction({
      entityType: 'brands',
      entityId: inserted[0].id.toString(),
      actionType: 'CREATE',
      performedById: currentUser.id,
      newData: inserted[0],
    });

    revalidatePath('/settings/master-data');

    return {
      success: true,
      message: 'Brand created successfully.',
    };
  } catch {
    return {
      success: false,
      message: 'Database error: this brand may already exist.',
    };
  }
}

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return {
      success: false,
      message: unauthorizedMasterDataResult().message,
    };
  }

  const parsed = categorySchema.safeParse({
    pillar: formData.get('pillar'),
    name: formData.get('name'),
    prefix: formData.get('prefix'),
    customSchema: String(
      formData.get('customSchema') ?? '{"modelSpecs":[],"assetTracking":[]}'
    ),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: 'Failed to validate category data.',
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const inserted = await db
      .insert(categories)
      .values({
        pillar: parsed.data.pillar,
        name: parsed.data.name,
        prefix: parsed.data.prefix,
        customSchema: parsed.data.customSchema,
        requiresSerial: true,
      })
      .returning({
        id: categories.id,
        pillar: categories.pillar,
        name: categories.name,
        prefix: categories.prefix,
        customSchema: categories.customSchema,
        requiresSerial: categories.requiresSerial,
      });

    if (inserted.length === 0) {
      return {
        success: false,
        message: 'Failed to create category.',
      };
    }

    await logAuditAction({
      entityType: 'asset-categories',
      entityId: inserted[0].id.toString(),
      actionType: 'CREATE',
      performedById: currentUser.id,
      newData: inserted[0],
    });

    revalidatePath('/settings/master-data');

    return {
      success: true,
      message: 'Category created successfully.',
    };
  } catch {
    return {
      success: false,
      message: 'Database error: category name or prefix may already exist.',
    };
  }
}

export async function createMasterDataRecord(
  _prevState: UpdateMasterDataState,
  formData: FormData
): Promise<UpdateMasterDataState> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return unauthorizedMasterDataResult();
  }

  const entityRaw = String(formData.get('entity') ?? '');
  let insertedId: number | undefined;

  if (
    !MASTER_DATA_RECORD_ENTITIES.includes(entityRaw as MasterDataRecordEntity)
  ) {
    return {
      success: false,
      message: 'Invalid record type supplied.',
    };
  }

  const entity = entityRaw as MasterDataRecordEntity;

  try {
    switch (entity) {
      case 'locations': {
        const nextLocationIdResult = await db
          .select({
            nextId: sql<number>`coalesce(max(${locations.id}), 0)::int + 1`,
          })
          .from(locations);
        const nextLocationId = nextLocationIdResult[0]?.nextId ?? 1;

        const parsed = locationSchema.safeParse({
          name: formData.get('name'),
          type: formData.get('type'),
          parentId: formData.get('parentId'),
          isActive: parseBooleanFormValue(formData.get('isActive')),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Failed to validate location data.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const inserted = await db
          .insert(locations)
          .values({
            locationCode: formatMasterDataCode(
              MASTER_DATA_CODE_PREFIX['locations'],
              nextLocationId
            ),
            name: parsed.data.name,
            type: parsed.data.type,
            parentId: parsed.data.parentId ?? null,
            isActive: parsed.data.isActive,
          })
          .returning({ id: locations.id });

        if (inserted.length === 0) {
          return {
            success: false,
            message: 'Failed to create location.',
          };
        }

        insertedId = inserted[0].id;
        break;
      }

      case 'asset-categories': {
        const nextCategoryIdResult = await db
          .select({
            nextId: sql<number>`coalesce(max(${categories.id}), 0)::int + 1`,
          })
          .from(categories);
        const nextCategoryId = nextCategoryIdResult[0]?.nextId ?? 1;

        const parsed = categorySchema.safeParse({
          pillar: formData.get('pillar'),
          name: formData.get('name'),
          prefix: formData.get('prefix'),
          customSchema: String(
            formData.get('customSchema') ??
              '{"modelSpecs":[],"assetTracking":[]}'
          ),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Failed to validate category data.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const inserted = await db
          .insert(categories)
          .values({
            categoryCode: formatMasterDataCode(
              MASTER_DATA_CODE_PREFIX['asset-categories'],
              nextCategoryId
            ),
            pillar: parsed.data.pillar,
            name: parsed.data.name,
            prefix: parsed.data.prefix,
            customSchema: parsed.data.customSchema,
            requiresSerial: true,
            isActive: parseBooleanFormValue(formData.get('isActive')),
          })
          .returning({ id: categories.id });

        if (inserted.length === 0) {
          return {
            success: false,
            message: 'Failed to create category.',
          };
        }

        insertedId = inserted[0].id;
        break;
      }

      case 'brands': {
        const nextBrandIdResult = await db
          .select({
            nextId: sql<number>`coalesce(max(${brands.id}), 0)::int + 1`,
          })
          .from(brands);
        const nextBrandId = nextBrandIdResult[0]?.nextId ?? 1;

        const parsed = brandSchema.safeParse({
          name: formData.get('name'),
          isActive: parseBooleanFormValue(formData.get('isActive')),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Failed to validate brand data.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const inserted = await db
          .insert(brands)
          .values({
            brandCode: formatMasterDataCode(
              MASTER_DATA_CODE_PREFIX['brands'],
              nextBrandId
            ),
            name: parsed.data.name,
            isActive: parsed.data.isActive,
          })
          .returning({ id: brands.id });

        if (inserted.length === 0) {
          return {
            success: false,
            message: 'Failed to create brand.',
          };
        }

        insertedId = inserted[0].id;
        break;
      }

      case 'device-models': {
        const nextModelIdResult = await db
          .select({
            nextId: sql<number>`coalesce(max(${models.id}), 0)::int + 1`,
          })
          .from(models);
        const nextModelId = nextModelIdResult[0]?.nextId ?? 1;

        const modelImageEntry = formData.get('modelImage');
        let uploadedImageUrl = '';

        if (modelImageEntry instanceof File && modelImageEntry.size > 0) {
          uploadedImageUrl = await uploadFileToStorage(
            modelImageEntry,
            'models'
          );
        }

        const parsed = deviceModelSchema.safeParse({
          name: formData.get('name'),
          brandId: formData.get('brandId'),
          categoryId: formData.get('categoryId'),
          imageUrl: uploadedImageUrl,
          technicalDetails: String(formData.get('technicalDetails') ?? '{}'),
          isActive: parseBooleanFormValue(formData.get('isActive')),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Failed to validate model data.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const inserted = await db
          .insert(models)
          .values({
            modelCode: formatMasterDataCode(
              MASTER_DATA_CODE_PREFIX['device-models'],
              nextModelId
            ),
            name: parsed.data.name,
            brandId: parsed.data.brandId,
            categoryId: parsed.data.categoryId,
            imageUrl:
              typeof parsed.data.imageUrl === 'string' &&
              parsed.data.imageUrl.trim().length > 0
                ? parsed.data.imageUrl.trim()
                : null,
            technicalDetails: parsed.data.technicalDetails,
            isActive: parsed.data.isActive,
          })
          .returning({ id: models.id });

        if (inserted.length === 0) {
          return {
            success: false,
            message: 'Failed to create model.',
          };
        }

        insertedId = inserted[0].id;
        break;
      }

      case 'vendors': {
        const nextVendorIdResult = await db
          .select({
            nextId: sql<number>`coalesce(max(${vendors.id}), 0)::int + 1`,
          })
          .from(vendors);
        const nextVendorId = nextVendorIdResult[0]?.nextId ?? 1;

        const parsed = vendorSchema.safeParse({
          companyName: formData.get('companyName'),
          email: String(formData.get('email') ?? ''),
          phone: String(formData.get('phone') ?? ''),
          website: String(formData.get('website') ?? ''),
          isActive: parseBooleanFormValue(formData.get('isActive')),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Failed to validate vendor data.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const inserted = await db
          .insert(vendors)
          .values({
            vendorCode: formatMasterDataCode(
              MASTER_DATA_CODE_PREFIX['vendors'],
              nextVendorId
            ),
            companyName: parsed.data.companyName,
            email:
              parsed.data.email && parsed.data.email.length > 0
                ? parsed.data.email
                : null,
            phone:
              parsed.data.phone && parsed.data.phone.length > 0
                ? parsed.data.phone
                : null,
            website:
              parsed.data.website && parsed.data.website.length > 0
                ? parsed.data.website
                : null,
            isActive: parsed.data.isActive,
          })
          .returning({ id: vendors.id });

        if (inserted.length === 0) {
          return {
            success: false,
            message: 'Failed to create vendor.',
          };
        }

        insertedId = inserted[0].id;
        break;
      }

      case 'departments': {
        const nextDepartmentIdResult = await db
          .select({
            nextId: sql<number>`coalesce(max(${departments.id}), 0)::int + 1`,
          })
          .from(departments);

        const nextDepartmentId = nextDepartmentIdResult[0]?.nextId ?? 1;
        const autoCostCenterId = `CC-${String(nextDepartmentId).padStart(4, '0')}`;

        const parsed = departmentSchema.safeParse({
          name: formData.get('name'),
          shortCode: formData.get('shortCode'),
          costCenterId: autoCostCenterId,
          isActive: parseBooleanFormValue(formData.get('isActive')),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Failed to validate department data.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const inserted = await db
          .insert(departments)
          .values({
            departmentCode: formatMasterDataCode(
              MASTER_DATA_CODE_PREFIX['departments'],
              nextDepartmentId
            ),
            name: parsed.data.name,
            shortCode: parsed.data.shortCode,
            costCenterId: parsed.data.costCenterId,
            isActive: parsed.data.isActive,
          })
          .returning({ id: departments.id });

        if (inserted.length === 0) {
          return {
            success: false,
            message: 'Failed to create department.',
          };
        }

        insertedId = inserted[0].id;
        break;
      }

      case 'owners': {
        const nextOwnerIdResult = await db
          .select({
            nextId: sql<number>`coalesce(max(${owners.id}), 0)::int + 1`,
          })
          .from(owners);
        const nextOwnerId = nextOwnerIdResult[0]?.nextId ?? 1;

        const parsed = ownerSchema.safeParse({
          companyName: formData.get('companyName'),
          isActive: parseBooleanFormValue(formData.get('isActive')),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Failed to validate owner data.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const inserted = await db
          .insert(owners)
          .values({
            ownerCode: formatMasterDataCode(
              MASTER_DATA_CODE_PREFIX['owners'],
              nextOwnerId
            ),
            companyName: parsed.data.companyName,
            isActive: parsed.data.isActive,
          })
          .returning({ id: owners.id });

        if (inserted.length === 0) {
          return {
            success: false,
            message: 'Failed to create owner.',
          };
        }

        insertedId = inserted[0].id;
        break;
      }
    }

    if (insertedId) {
      await logAuditAction({
        entityType: entity,
        entityId: insertedId.toString(),
        actionType: 'CREATE',
        performedById: currentUser.id,
      });
    }

    revalidatePath('/settings/master-data');

    return {
      success: true,
      message: 'Record created successfully.',
    };
  } catch (error) {
    if (error instanceof Error && error.message.length > 0) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: 'Database error: failed to create record.',
    };
  }
}

export async function updateMasterDataRecord(
  _prevState: UpdateMasterDataState,
  formData: FormData
): Promise<UpdateMasterDataState> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'GlobalAdmin') {
    return unauthorizedMasterDataResult();
  }

  const entityRaw = String(formData.get('entity') ?? '');
  const idRaw = Number(formData.get('id'));

  if (
    !MASTER_DATA_RECORD_ENTITIES.includes(entityRaw as MasterDataRecordEntity)
  ) {
    return {
      success: false,
      message: 'Invalid record type supplied.',
    };
  }

  if (!Number.isInteger(idRaw) || idRaw <= 0) {
    return {
      success: false,
      message: 'Invalid record id supplied.',
    };
  }

  const entity = entityRaw as MasterDataRecordEntity;

  try {
    switch (entity) {
      case 'locations': {
        const hasParentField = formData.has('parentId');

        const parsed = locationSchema.safeParse({
          name: formData.get('name'),
          type: formData.get('type'),
          parentId: hasParentField ? formData.get('parentId') : undefined,
          isActive: parseBooleanFormValue(formData.get('isActive')),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Failed to validate location data.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const updateValues: {
          name: string;
          type: LocationType;
          isActive: boolean;
          parentId?: number | null;
        } = {
          name: parsed.data.name,
          type: parsed.data.type,
          isActive: parsed.data.isActive,
        };

        if (hasParentField) {
          updateValues.parentId = parsed.data.parentId ?? null;
        }

        const oldRecord = await db.query.locations.findFirst({
          where: eq(locations.id, idRaw),
        });

        const updated = await db
          .update(locations)
          .set(updateValues)
          .where(eq(locations.id, idRaw))
          .returning();

        if (updated.length === 0 || !oldRecord) {
          return { success: false, message: 'Location not found.' };
        }

        await logAuditAction({
          entityType: entity,
          entityId: idRaw.toString(),
          actionType: 'UPDATE',
          performedById: currentUser.id,
          oldData: oldRecord as Record<string, unknown>,
          newData: updated[0] as Record<string, unknown>,
        });

        break;
      }

      case 'asset-categories': {
        const name = parseRequiredText(
          formData.get('name'),
          'Category name',
          2
        );
        const pillar = String(formData.get('pillar') ?? '').trim();

        if (!name.ok) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: { name: [name.error] },
          };
        }

        if (!CATEGORY_PILLARS.has(pillar)) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: {
              pillar: ['Invalid pillar provided.'],
            },
          };
        }

        const oldRecord = await db.query.categories.findFirst({
          where: eq(categories.id, idRaw),
        });

        const updated = await db
          .update(categories)
          .set({
            name: name.value,
            pillar: pillar as
              | 'IT & Digital'
              | 'Software'
              | 'Office Furniture'
              | 'Office Electronics',
            isActive: parseBooleanFormValue(formData.get('isActive')),
          })
          .where(eq(categories.id, idRaw))
          .returning();

        if (updated.length === 0 || !oldRecord) {
          return { success: false, message: 'Category not found.' };
        }

        await logAuditAction({
          entityType: entity,
          entityId: idRaw.toString(),
          actionType: 'UPDATE',
          performedById: currentUser.id,
          oldData: oldRecord as Record<string, unknown>,
          newData: updated[0] as Record<string, unknown>,
        });
        break;
      }

      case 'brands': {
        const name = parseRequiredText(formData.get('name'), 'Brand name', 2);
        if (!name.ok) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: { name: [name.error] },
          };
        }

        const oldRecord = await db.query.brands.findFirst({
          where: eq(brands.id, idRaw),
        });

        const updated = await db
          .update(brands)
          .set({
            name: name.value,
            isActive: parseBooleanFormValue(formData.get('isActive')),
          })
          .where(eq(brands.id, idRaw))
          .returning();

        if (updated.length === 0 || !oldRecord) {
          return { success: false, message: 'Brand not found.' };
        }

        await logAuditAction({
          entityType: entity,
          entityId: idRaw.toString(),
          actionType: 'UPDATE',
          performedById: currentUser.id,
          oldData: oldRecord as Record<string, unknown>,
          newData: updated[0] as Record<string, unknown>,
        });
        break;
      }

      case 'device-models': {
        const modelImageEntry = formData.get('modelImage');
        let uploadedImageUrl = '';

        if (modelImageEntry instanceof File && modelImageEntry.size > 0) {
          uploadedImageUrl = await uploadFileToStorage(
            modelImageEntry,
            'models'
          );
        }

        const parsed = deviceModelSchema.safeParse({
          name: formData.get('name'),
          brandId: formData.get('brandId'),
          categoryId: formData.get('categoryId'),
          imageUrl: formData.get('imageUrl'),
          technicalDetails: String(formData.get('technicalDetails') ?? '{}'),
          isActive: parseBooleanFormValue(formData.get('isActive')),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const oldRecord = await db.query.models.findFirst({
          where: eq(models.id, idRaw),
        });

        const updated = await db
          .update(models)
          .set({
            name: parsed.data.name,
            brandId: parsed.data.brandId,
            categoryId: parsed.data.categoryId,
            imageUrl:
              uploadedImageUrl ||
              (typeof parsed.data.imageUrl === 'string' &&
              parsed.data.imageUrl.trim().length > 0
                ? parsed.data.imageUrl.trim()
                : null),
            technicalDetails: parsed.data.technicalDetails,
            isActive: parsed.data.isActive,
          })
          .where(eq(models.id, idRaw))
          .returning();

        if (updated.length === 0 || !oldRecord) {
          return { success: false, message: 'Model not found.' };
        }

        await logAuditAction({
          entityType: entity,
          entityId: idRaw.toString(),
          actionType: 'UPDATE',
          performedById: currentUser.id,
          oldData: oldRecord as Record<string, unknown>,
          newData: updated[0] as Record<string, unknown>,
        });
        break;
      }

      case 'vendors': {
        const parsed = vendorSchema.safeParse({
          companyName: formData.get('companyName'),
          email: String(formData.get('email') ?? ''),
          phone: String(formData.get('phone') ?? ''),
          website: String(formData.get('website') ?? ''),
          isActive: parseBooleanFormValue(formData.get('isActive')),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const oldRecord = await db.query.vendors.findFirst({
          where: eq(vendors.id, idRaw),
        });

        const updated = await db
          .update(vendors)
          .set({
            companyName: parsed.data.companyName,
            email:
              parsed.data.email && parsed.data.email.length > 0
                ? parsed.data.email
                : null,
            phone:
              parsed.data.phone && parsed.data.phone.length > 0
                ? parsed.data.phone
                : null,
            website:
              parsed.data.website && parsed.data.website.length > 0
                ? parsed.data.website
                : null,
            isActive: parsed.data.isActive,
          })
          .where(eq(vendors.id, idRaw))
          .returning();

        if (updated.length === 0 || !oldRecord) {
          return { success: false, message: 'Vendor not found.' };
        }

        await logAuditAction({
          entityType: entity,
          entityId: idRaw.toString(),
          actionType: 'UPDATE',
          performedById: currentUser.id,
          oldData: oldRecord as Record<string, unknown>,
          newData: updated[0] as Record<string, unknown>,
        });
        break;
      }

      case 'owners': {
        const parsed = ownerSchema.safeParse({
          companyName: formData.get('companyName'),
          isActive: parseBooleanFormValue(formData.get('isActive')),
        });

        if (!parsed.success) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const oldRecord = await db.query.owners.findFirst({
          where: eq(owners.id, idRaw),
        });

        const updated = await db
          .update(owners)
          .set({
            companyName: parsed.data.companyName,
            isActive: parsed.data.isActive,
          })
          .where(eq(owners.id, idRaw))
          .returning();

        if (updated.length === 0 || !oldRecord) {
          return { success: false, message: 'Owner not found.' };
        }

        await logAuditAction({
          entityType: entity,
          entityId: idRaw.toString(),
          actionType: 'UPDATE',
          performedById: currentUser.id,
          oldData: oldRecord as Record<string, unknown>,
          newData: updated[0] as Record<string, unknown>,
        });
        break;
      }

      case 'departments': {
        const name = parseRequiredText(
          formData.get('name'),
          'Department name',
          2
        );
        const shortCode = parseRequiredText(
          formData.get('shortCode'),
          'Department code',
          1
        );
        const costCenterId = parseRequiredText(
          formData.get('costCenterId'),
          'Cost center id',
          2
        );

        const errors: FormErrorMap<string> = {};
        if (!name.ok) {
          errors.name = [name.error];
        }
        if (!shortCode.ok) {
          errors.shortCode = [shortCode.error];
        }
        if (!costCenterId.ok) {
          errors.costCenterId = [costCenterId.error];
        }

        if (Object.keys(errors).length > 0) {
          return {
            success: false,
            message: 'Validation failed.',
            errors,
          };
        }

        const oldRecord = await db.query.departments.findFirst({
          where: eq(departments.id, idRaw),
        });

        const updated = await db
          .update(departments)
          .set({
            name: name.value,
            shortCode: shortCode.value,
            costCenterId: costCenterId.value,
            isActive: parseBooleanFormValue(formData.get('isActive')),
          })
          .where(eq(departments.id, idRaw))
          .returning();

        if (updated.length === 0 || !oldRecord) {
          return { success: false, message: 'Department not found.' };
        }

        await logAuditAction({
          entityType: entity,
          entityId: idRaw.toString(),
          actionType: 'UPDATE',
          performedById: currentUser.id,
          oldData: oldRecord as Record<string, unknown>,
          newData: updated[0] as Record<string, unknown>,
        });
        break;
      }
    }

    revalidatePath('/settings/master-data');

    return {
      success: true,
      message: 'Record updated successfully.',
    };
  } catch {
    return {
      success: false,
      message: 'Database error: failed to update record.',
    };
  }
}
