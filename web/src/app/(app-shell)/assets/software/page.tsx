import { and, asc, eq } from 'drizzle-orm';

import { SoftwareRegistryPageClient } from '@/components/assets/software-registration-form';
import { db } from '@/db';
import { brands, categories, vendors } from '@/db/schema';

type SoftwareRegistrationOptionsPayload = {
  categoryOptions: Array<{ value: string; label: string }>;
  publisherOptions: Array<{ value: string; label: string }>;
  vendorOptions: Array<{ value: string; label: string }>;
};

async function getSoftwareRegistrationOptions() {
  try {
    const [categoryRows, publisherRows, vendorRows] = await Promise.all([
      db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(
          and(eq(categories.isActive, true), eq(categories.pillar, 'Software'))
        )
        .orderBy(asc(categories.name)),
      db
        .select({ id: brands.id, name: brands.name })
        .from(brands)
        .where(eq(brands.isActive, true))
        .orderBy(asc(brands.name)),
      db
        .select({ id: vendors.id, name: vendors.companyName })
        .from(vendors)
        .where(and(eq(vendors.isActive, true), eq(vendors.pillar, 'Software')))
        .orderBy(asc(vendors.companyName)),
    ]);

    return {
      categoryOptions: categoryRows.map((row) => ({
        value: String(row.id),
        label: row.name,
      })),
      publisherOptions: publisherRows.map((row) => ({
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
      publisherOptions: [],
      vendorOptions: [],
    } satisfies SoftwareRegistrationOptionsPayload;
  }
}

export default async function SoftwarePage() {
  const { categoryOptions, publisherOptions, vendorOptions } =
    await getSoftwareRegistrationOptions();

  return (
    <SoftwareRegistryPageClient
      categoryOptions={categoryOptions}
      publisherOptions={publisherOptions}
      vendorOptions={vendorOptions}
    />
  );
}