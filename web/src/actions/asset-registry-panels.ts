'use server';

import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  brands,
  categories,
  models,
  owners,
  pillarEnum,
  vendors,
} from '@/db/schema';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';

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

export async function getRegistrationOptionsAction(pillar: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, message: 'Unauthorized', data: null };

  const pillarValue = pillar as (typeof pillarEnum.enumValues)[number];

  const [categoriesList, brandsList, modelsList, vendorsList, ownersList] =
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
        where: and(eq(models.isActive, true)), // No pillar column on models table
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
    },
  };
}
