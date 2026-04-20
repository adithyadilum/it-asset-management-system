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
import { brandSchema, categorySchema } from '@/lib/validations/master-data';

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
    customSchema: String(formData.get('customSchema') ?? '[]'),
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
        const name = parseRequiredText(
          formData.get('name'),
          'Location name',
          2
        );
        if (!name.ok) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: { name: [name.error] },
          };
        }

        const typeValue = String(formData.get('type') ?? '').trim();
        const updated = await db
          .update(locations)
          .set({
            name: name.value,
            type: typeValue.length > 0 ? typeValue : null,
            isActive: parseBooleanFormValue(formData.get('isActive')),
          })
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
        const companyName = parseRequiredText(
          formData.get('companyName'),
          'Vendor name',
          2
        );
        if (!companyName.ok) {
          return {
            success: false,
            message: 'Validation failed.',
            errors: { companyName: [companyName.error] },
          };
        }

        const contactInfoValue = String(
          formData.get('contactInfo') ?? ''
        ).trim();
        const updated = await db
          .update(vendors)
          .set({
            companyName: companyName.value,
            contactInfo: contactInfoValue.length > 0 ? contactInfoValue : null,
            isActive: parseBooleanFormValue(formData.get('isActive')),
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
