'use server';

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

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
  sessions,
  users,
  vendors,
} from '@/db/schema';
import { getJwtSecretKey } from '@/lib/jwt';
import { MASTER_DATA_RECORD_ENTITIES } from '@/lib/master-data/shared';
import { isValidUuid } from '@/lib/uuid';
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
  vendorSchema,
} from '@/lib/validations/master-data';
import { type LocationType } from '@/types/master-data';

const SESSION_COOKIE_NAME = 'session_token';

type UserRole = typeof users.$inferSelect.role;

const CATEGORY_PILLARS = new Set([
  'IT & Digital',
  'Software',
  'Office Furniture',
  'Office Electronics',
]);

function normalizeTokenRole(role: unknown): UserRole | null {
  if (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinanceAuditor' ||
    role === 'Employee'
  ) {
    return role;
  }

  return null;
}

async function getAuthenticatedUser(): Promise<{
  id: string;
  role: UserRole;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());

    if (!isValidUuid(payload.sub)) {
      return null;
    }

    if (!payload.sid || typeof payload.sid !== 'string') {
      return null;
    }

    const role = normalizeTokenRole(payload.role);
    if (!role) {
      return null;
    }

    const activeSession = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenId, payload.sid),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (activeSession.length === 0) {
      return null;
    }

    return {
      id: payload.sub,
      role,
    };
  } catch {
    return null;
  }
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

    switch (entity) {
      case 'locations': {
        const deleted = await db
          .delete(locations)
          .where(inArray(locations.id, recordIds))
          .returning({ id: locations.id });
        deletedCount = deleted.length;
        break;
      }
      case 'asset-categories': {
        const deleted = await db
          .delete(categories)
          .where(inArray(categories.id, recordIds))
          .returning({ id: categories.id });
        deletedCount = deleted.length;
        break;
      }
      case 'brands': {
        const deleted = await db
          .delete(brands)
          .where(inArray(brands.id, recordIds))
          .returning({ id: brands.id });
        deletedCount = deleted.length;
        break;
      }
      case 'device-models': {
        const deleted = await db
          .delete(models)
          .where(inArray(models.id, recordIds))
          .returning({ id: models.id });
        deletedCount = deleted.length;
        break;
      }
      case 'vendors': {
        const deleted = await db
          .delete(vendors)
          .where(inArray(vendors.id, recordIds))
          .returning({ id: vendors.id });
        deletedCount = deleted.length;
        break;
      }
      case 'departments': {
        const deleted = await db
          .delete(departments)
          .where(inArray(departments.id, recordIds))
          .returning({ id: departments.id });
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
    await db.insert(brands).values({
      name: parsed.data.name,
      isActive: parsed.data.isActive,
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
    await db.insert(categories).values({
      pillar: parsed.data.pillar,
      name: parsed.data.name,
      prefix: parsed.data.prefix,
      customSchema: parsed.data.customSchema,
      requiresSerial: true,
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

        break;
      }

      case 'asset-categories': {
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

        break;
      }

      case 'brands': {
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

        break;
      }

      case 'device-models': {
        const parsed = deviceModelSchema.safeParse({
          name: formData.get('name'),
          brandId: formData.get('brandId'),
          categoryId: formData.get('categoryId'),
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
            name: parsed.data.name,
            brandId: parsed.data.brandId,
            categoryId: parsed.data.categoryId,
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
            message: 'Failed to validate vendor data.',
            errors: parsed.error.flatten().fieldErrors,
          };
        }

        const inserted = await db
          .insert(vendors)
          .values({
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

        break;
      }
    }

    revalidatePath('/settings/master-data');

    return {
      success: true,
      message: 'Record created successfully.',
    };
  } catch {
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

        const updated = await db
          .update(locations)
          .set(updateValues)
          .where(eq(locations.id, idRaw))
          .returning({ id: locations.id });

        if (updated.length === 0) {
          return { success: false, message: 'Location not found.' };
        }
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
          .returning({ id: categories.id });

        if (updated.length === 0) {
          return { success: false, message: 'Category not found.' };
        }
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

        const updated = await db
          .update(brands)
          .set({
            name: name.value,
            isActive: parseBooleanFormValue(formData.get('isActive')),
          })
          .where(eq(brands.id, idRaw))
          .returning({ id: brands.id });

        if (updated.length === 0) {
          return { success: false, message: 'Brand not found.' };
        }
        break;
      }

      case 'device-models': {
        const parsed = deviceModelSchema.safeParse({
          name: formData.get('name'),
          brandId: formData.get('brandId'),
          categoryId: formData.get('categoryId'),
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

        const updated = await db
          .update(models)
          .set({
            name: parsed.data.name,
            brandId: parsed.data.brandId,
            categoryId: parsed.data.categoryId,
            technicalDetails: parsed.data.technicalDetails,
            isActive: parsed.data.isActive,
          })
          .where(eq(models.id, idRaw))
          .returning({ id: models.id });

        if (updated.length === 0) {
          return { success: false, message: 'Model not found.' };
        }
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
          .returning({ id: vendors.id });

        if (updated.length === 0) {
          return { success: false, message: 'Vendor not found.' };
        }
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

        const updated = await db
          .update(departments)
          .set({
            name: name.value,
            shortCode: shortCode.value,
            costCenterId: costCenterId.value,
            isActive: parseBooleanFormValue(formData.get('isActive')),
          })
          .where(eq(departments.id, idRaw))
          .returning({ id: departments.id });

        if (updated.length === 0) {
          return { success: false, message: 'Department not found.' };
        }
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
