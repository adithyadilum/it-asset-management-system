import { and, asc, eq } from 'drizzle-orm';

import { HardwareRegistryPageClient } from '@/components/assets/registration-form';
import { db } from '@/db';
import { brands, categories, models, users, vendors } from '@/db/schema';

type RegistrationOptionsPayload = {
  categoryOptions: Array<{ value: string; label: string }>;
  brandOptions: Array<{ value: string; label: string }>;
  modelOptions: Array<{
    value: string;
    label: string;
    brandId: string;
    categoryId: string;
  }>;
  ownerOptions: Array<{ value: string; label: string }>;
  vendorOptions: Array<{ value: string; label: string }>;
};

async function getHardwareRegistrationOptions() {
  try {
    const [categoryRows, brandRows, modelRows, ownerRows, vendorRows] =
      await Promise.all([
        db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(
            and(
              eq(categories.isActive, true),
              eq(categories.pillar, 'IT & Digital')
            )
          )
          .orderBy(asc(categories.name)),
        db
          .select({ id: brands.id, name: brands.name })
          .from(brands)
          .where(eq(brands.isActive, true))
          .orderBy(asc(brands.name)),
        db
          .select({
            id: models.id,
            name: models.name,
            brandName: brands.name,
            brandId: models.brandId,
            categoryId: models.categoryId,
          })
          .from(models)
          .leftJoin(brands, eq(models.brandId, brands.id))
          .where(eq(models.isActive, true))
          .orderBy(asc(models.name)),
        db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.isActive, true))
          .orderBy(asc(users.name)),
        db
          .select({ id: vendors.id, name: vendors.companyName })
          .from(vendors)
          .where(eq(vendors.isActive, true))
          .orderBy(asc(vendors.companyName)),
      ]);

    return {
      categoryOptions: categoryRows.map((row) => ({
        value: String(row.id),
        label: row.name,
      })),
      brandOptions: brandRows.map((row) => ({
        value: String(row.id),
        label: row.name,
      })),
      modelOptions: modelRows.map((row) => ({
        value: String(row.id),
        label: row.brandName ? `${row.brandName} ${row.name}` : row.name,
        brandId: String(row.brandId),
        categoryId: String(row.categoryId),
      })),
      ownerOptions: ownerRows.map((row) => ({
        value: String(row.id),
        label: row.name,
      })),
      vendorOptions: vendorRows.map((row) => ({
        value: String(row.id),
        label: row.name,
      })),
    };
  } catch {
    return {
      categoryOptions: [],
      brandOptions: [],
      modelOptions: [],
      ownerOptions: [],
      vendorOptions: [],
    } satisfies RegistrationOptionsPayload;
  }
}

export default async function HardwarePage() {
  const { categoryOptions, brandOptions, modelOptions, ownerOptions, vendorOptions } =
    await getHardwareRegistrationOptions();

  return (
    <HardwareRegistryPageClient
      categoryOptions={categoryOptions}
      brandOptions={brandOptions}
      modelOptions={modelOptions}
      ownerOptions={ownerOptions}
      vendorOptions={vendorOptions}
    />
  );
}
