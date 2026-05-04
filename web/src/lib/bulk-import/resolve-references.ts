import { db } from '@/db';
import {
  assets,
  brands,
  locations,
  models,
  owners,
  vendors,
} from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export type MasterDataCache = {
  brands: Map<string, { id: number; isActive: boolean }>;
  models: Map<string, { id: number; brandId: number; isActive: boolean }>; // Key: "modelname|brandid"
  locations: Map<string, { id: number; isActive: boolean }>;
  vendors: Map<string, { id: number; isActive: boolean }>;
  owners: Map<string, { id: number; isActive: boolean }>;
  serialNumbers: Set<string>;
};

export async function preloadMasterDataCache(
  categoryId: number
): Promise<MasterDataCache> {
  const [
    allBrands,
    allModels,
    allLocations,
    allVendors,
    allOwners,
    allSerials,
  ] = await Promise.all([
    db
      .select({ id: brands.id, name: brands.name, isActive: brands.isActive })
      .from(brands),
    db
      .select({
        id: models.id,
        name: models.name,
        brandId: models.brandId,
        isActive: models.isActive,
      })
      .from(models)
      .where(eq(models.categoryId, categoryId)),
    db
      .select({
        id: locations.id,
        name: locations.name,
        isActive: locations.isActive,
      })
      .from(locations),
    db
      .select({
        id: vendors.id,
        name: vendors.companyName,
        isActive: vendors.isActive,
      })
      .from(vendors),
    db
      .select({
        id: owners.id,
        name: owners.companyName,
        isActive: owners.isActive,
      })
      .from(owners),
    db
      .select({ serialNumber: assets.serialNumber })
      .from(assets)
      .where(sql`${assets.serialNumber} IS NOT NULL`),
  ]);

  const normalize = (name: string) => name.trim().toLowerCase();

  const cache: MasterDataCache = {
    brands: new Map(),
    models: new Map(),
    locations: new Map(),
    vendors: new Map(),
    owners: new Map(),
    serialNumbers: new Set(),
  };

  allBrands.forEach((b) =>
    cache.brands.set(normalize(b.name), { id: b.id, isActive: b.isActive })
  );

  allModels.forEach((m) =>
    cache.models.set(`${normalize(m.name)}|${m.brandId}`, {
      id: m.id,
      brandId: m.brandId,
      isActive: m.isActive,
    })
  );

  allLocations.forEach((l) =>
    cache.locations.set(normalize(l.name), { id: l.id, isActive: l.isActive })
  );

  allVendors.forEach((v) =>
    cache.vendors.set(normalize(v.name), { id: v.id, isActive: v.isActive })
  );

  allOwners.forEach((o) =>
    cache.owners.set(normalize(o.name), { id: o.id, isActive: o.isActive })
  );

  allSerials.forEach((s) => {
    if (s.serialNumber) cache.serialNumbers.add(normalize(s.serialNumber));
  });

  return cache;
}
