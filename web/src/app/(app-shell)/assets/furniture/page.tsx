import { and, asc, eq } from 'drizzle-orm';

import { FurnitureRegistryPageClient } from '@/components/assets/furniture-registration-form';
import { db } from '@/db';
import { brands, categories, locations, models, vendors } from '@/db/schema';

type FurnitureRegistrationOptionsPayload = {
  categoryOptions: Array<{ value: string; label: string }>;
  manufacturerOptions: Array<{ value: string; label: string }>;
  productLineOptions: Array<{
    value: string;
    label: string;
    manufacturerId: string;
    categoryId: string;
  }>;
  locationOptions: Array<{ value: string; label: string }>;
  vendorOptions: Array<{ value: string; label: string }>;
};

async function getFurnitureRegistrationOptions() {
  try {
    const [categoryRows, manufacturerRows, productLineRows, locationRows, vendorRows] =
      await Promise.all([
        db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(
            and(
              eq(categories.isActive, true),
              eq(categories.pillar, 'Office Furniture')
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
            manufacturerName: brands.name,
            manufacturerId: models.brandId,
            categoryId: models.categoryId,
          })
          .from(models)
          .leftJoin(brands, eq(models.brandId, brands.id))
          .leftJoin(categories, eq(models.categoryId, categories.id))
          .where(
            and(
              eq(models.isActive, true),
              eq(categories.isActive, true),
              eq(categories.pillar, 'Office Furniture')
            )
          )
          .orderBy(asc(models.name)),
        db
          .select({ id: locations.id, name: locations.name })
          .from(locations)
          .where(eq(locations.isActive, true))
          .orderBy(asc(locations.name)),
        db
          .select({ id: vendors.id, name: vendors.companyName })
          .from(vendors)
          .where(
            and(
              eq(vendors.isActive, true),
              eq(vendors.pillar, 'Office Furniture')
            )
          )
          .orderBy(asc(vendors.companyName)),
      ]);

    return {
      categoryOptions: categoryRows.map((row) => ({
        value: String(row.id),
        label: row.name,
      })),
      manufacturerOptions: manufacturerRows.map((row) => ({
        value: String(row.id),
        label: row.name,
      })),
      productLineOptions: productLineRows.map((row) => ({
        value: String(row.id),
        label: row.manufacturerName ? `${row.manufacturerName} ${row.name}` : row.name,
        manufacturerId: String(row.manufacturerId),
        categoryId: String(row.categoryId),
      })),
      locationOptions: locationRows.map((row) => ({
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
      manufacturerOptions: [],
      productLineOptions: [],
      locationOptions: [],
      vendorOptions: [],
    } satisfies FurnitureRegistrationOptionsPayload;
  }
}

export default async function FurniturePage() {
  const {
    categoryOptions,
    manufacturerOptions,
    productLineOptions,
    locationOptions,
    vendorOptions,
  } = await getFurnitureRegistrationOptions();

  return (
    <FurnitureRegistryPageClient
      categoryOptions={categoryOptions}
      manufacturerOptions={manufacturerOptions}
      productLineOptions={productLineOptions}
      locationOptions={locationOptions}
      vendorOptions={vendorOptions}
    />
  );
}
