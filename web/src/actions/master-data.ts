'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import {
  brands,
  categories,
  departments,
  locations,
  models,
  vendors,
} from '@/db/schema';
import { MASTER_DATA_RECORD_ENTITIES } from '@/lib/master-data/shared';
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

const CATEGORY_PILLARS = new Set([
  'IT & Digital',
  'Software',
  'Office Furniture',
  'Office Electronics',
]);

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

export async function createBrand(
  _prevState: BrandFormState,
  formData: FormData
): Promise<BrandFormState> {
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
            message: 'Failed to create device model.',
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
        const parsed = departmentSchema.safeParse({
          name: formData.get('name'),
          shortCode: formData.get('shortCode'),
          costCenterId: formData.get('costCenterId'),
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
        const prefix = String(formData.get('prefix') ?? '')
          .trim()
          .toUpperCase();
        const pillar = String(formData.get('pillar') ?? '').trim();

        if (!name.ok) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: { name: [name.error] },
          };
        }

        if (!/^[A-Z0-9]{3}$/.test(prefix)) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: {
              prefix: ['Prefix must be exactly 3 alphanumeric characters.'],
            },
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
            prefix,
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
        const name = parseRequiredText(formData.get('name'), 'Model name', 2);
        if (!name.ok) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: { name: [name.error] },
          };
        }

        const updated = await db
          .update(models)
          .set({
            name: name.value,
            isActive: parseBooleanFormValue(formData.get('isActive')),
          })
          .where(eq(models.id, idRaw))
          .returning({ id: models.id });

        if (updated.length === 0) {
          return { success: false, message: 'Device model not found.' };
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
