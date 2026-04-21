import { and, asc, eq } from 'drizzle-orm';

import { OfficeElectronicsRegistryPageClient } from '@/components/assets/office-electronics-registration-form';
import { db } from '@/db';
import { brands, categories, locations, vendors } from '@/db/schema';

type OfficeElectronicsRegistrationOptionsPayload = {
  categoryOptions: Array<{ value: string; label: string }>;
  brandOptions: Array<{ value: string; label: string }>;
  locationOptions: Array<{ value: string; label: string }>;
  vendorOptions: Array<{ value: string; label: string }>;
};

async function getOfficeElectronicsRegistrationOptions() {
  try {
    const [categoryRows, brandRows, locationRows, vendorRows] = await Promise.all([
      db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(
          and(
            eq(categories.isActive, true),
            eq(categories.pillar, 'Office Electronics')
          )
        )
        .orderBy(asc(categories.name)),
      db
        .select({ id: brands.id, name: brands.name })
        .from(brands)
        .where(eq(brands.isActive, true))
        .orderBy(asc(brands.name)),
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
            eq(vendors.pillar, 'Office Electronics')
          )
        )
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
      brandOptions: [],
      locationOptions: [],
      vendorOptions: [],
    } satisfies OfficeElectronicsRegistrationOptionsPayload;
  }
}

export default async function OfficeElectronicsPage() {
  const { categoryOptions, brandOptions, locationOptions, vendorOptions } =
    await getOfficeElectronicsRegistrationOptions();

  return (
    <OfficeElectronicsRegistryPageClient
      categoryOptions={categoryOptions}
      brandOptions={brandOptions}
      locationOptions={locationOptions}
      vendorOptions={vendorOptions}
    />
  );
}
