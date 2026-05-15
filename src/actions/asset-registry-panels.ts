'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  brands,
  categories,
  locations,
  models,
  owners,
  pillarEnum,
  vendors,
} from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';

export async function getAssetDetailsByIdAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, message: 'Unauthorized', data: null };
  }

  const { getAssetDetailsById } = await import('@/lib/data/asset-details-repo');
  const details = await getAssetDetailsById(id);
  return { success: true, data: details };
}

export async function getAssetHistoryByIdAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, message: 'Unauthorized', data: [] };

  const { getAssetHistoryById } = await import('@/lib/data/asset-details-repo');
  const history = await getAssetHistoryById(id);
  return { success: true, data: history };
}

export async function getAssetMaintenanceByIdAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, message: 'Unauthorized', data: [] };

  const { getAssetMaintenanceById } =
    await import('@/lib/data/asset-details-repo');
  const maintenance = await getAssetMaintenanceById(id);
  return { success: true, data: maintenance };
}

export async function getAssetAllocationsAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, message: 'Unauthorized', data: [] };

  const { getAssetAllocationsById } =
    await import('@/lib/data/asset-details-repo');
  const allocations = await getAssetAllocationsById(id);
  return { success: true, data: allocations };
}

export async function getAssetDisposalAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, message: 'Unauthorized', data: null };

  const { getAssetDisposalById } =
    await import('@/lib/data/asset-details-repo');
  const disposal = await getAssetDisposalById(id);
  return { success: true, data: disposal };
}

export async function getRegistrationOptionsAction(pillar: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, message: 'Unauthorized', data: null };

  const pillarValue = pillar as (typeof pillarEnum.enumValues)[number];

  const [categoriesList, brandsList, modelsList, vendorsList, ownersList, locationsList] =
    await Promise.all([
      db.query.categories.findMany({
        where: and(
          eq(categories.isActive, true),
          eq(categories.pillar, pillarValue)
        ),
        columns: { id: true, name: true, pillar: true, customSchema: true },
      }),
      db.query.brands.findMany({
        where: eq(brands.isActive, true),
        columns: { id: true, name: true },
      }),
      db.query.models.findMany({
        where: and(
          eq(models.isActive, true),
          inArray(
            models.categoryId,
            db.select({ id: categories.id }).from(categories).where(eq(categories.pillar, pillarValue))
          )
        ),
        columns: {
          id: true,
          name: true,
          brandId: true,
          categoryId: true,
          imageUrl: true,
        },
      }),
      db.query.vendors.findMany({
        where: eq(vendors.isActive, true),
        columns: { id: true, companyName: true },
      }),
      db.query.owners.findMany({
        where: eq(owners.isActive, true),
        columns: { id: true, companyName: true },
      }),
      ['Office Furniture', 'Office Electronics'].includes(pillarValue)
        ? db.query.locations.findMany({
            where: eq(locations.isActive, true),
            columns: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

  return {
    success: true,
    data: {
      categories: categoriesList.map(
        (c: {
          id: number;
          name: string;
          pillar: string;
          customSchema: unknown;
        }) => ({
          value: String(c.id),
          label: c.name,
          pillar: c.pillar,
          customSchema: c.customSchema,
        })
      ),
      brands: brandsList.map((b: { id: number; name: string }) => ({
        value: String(b.id),
        label: b.name,
      })),
      models: modelsList.map(
        (m: {
          id: number;
          name: string;
          brandId: number;
          categoryId: number;
          imageUrl: string | null;
        }) => ({
          value: String(m.id),
          label: m.name,
          brandId: String(m.brandId),
          categoryId: String(m.categoryId),
          imageUrl: m.imageUrl,
        })
      ),
      vendors: vendorsList.map((v: { id: number; companyName: string }) => ({
        value: String(v.id),
        label: v.companyName,
      })),
      owners: ownersList.map((o: { id: number; companyName: string }) => ({
        value: String(o.id),
        label: o.companyName,
      })),
      locations: locationsList.map((l: { id: number; name: string }) => ({
        value: String(l.id),
        label: l.name,
      })),
    },
  };
}
