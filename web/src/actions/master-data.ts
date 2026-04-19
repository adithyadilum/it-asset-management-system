'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { brands, categories } from '@/db/schema';
import { brandSchema, categorySchema } from '@/lib/validations/master-data';

type FormErrorMap<TFields extends string> = Partial<Record<TFields, string[]>>;

export type BrandFormState = {
  success: boolean;
  message: string;
  errors?: FormErrorMap<'name' | 'isActive'>;
};

export type CategoryFormState = {
  success: boolean;
  message: string;
  errors?: FormErrorMap<'pillar' | 'name' | 'prefix' | 'customSchema'>;
};

export const INITIAL_BRAND_FORM_STATE: BrandFormState = {
  success: false,
  message: '',
};

export const INITIAL_CATEGORY_FORM_STATE: CategoryFormState = {
  success: false,
  message: '',
};

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
