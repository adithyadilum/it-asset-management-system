'use server';

import { eq, desc } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import {
  assetDisposals,
  assetPurchases,
  assets,
  users,
  models,
  categories,
  brands,
} from '@/db/schema';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { getAssetFinancialVitals } from '@/actions/asset-financial-vitals';
import type { DisposalReviewDetails } from '@/types/disposals';
import { assertAdmin } from '@/lib/auth/roles';

export async function getDisposalReviewDetails(
  disposalId: number
): Promise<DisposalReviewDetails> {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('UNAUTHENTICATED');
  assertAdmin(user);

  if (!Number.isFinite(disposalId) || disposalId <= 0) {
    throw new Error('Invalid disposal id.');
  }

  try {
    const queryTimer = startLatencyTimer();

    const rows = await db
      .select({
        disposalId: assetDisposals.id,
        assetId: assets.id,
        assetTag: assets.assetTag,
        assetName: assets.name,
        serialNumber: assets.serialNumber,
        createdAt: assets.createdAt,
        categoryName: categories.name,
        brandName: brands.name,
        requestedBy: users.name,
        requestedAt: assetDisposals.requestedAt,
        reason: assetDisposals.reason,
        justification: assetDisposals.justification,
        purchaseDate: assetPurchases.purchaseDate,
        totalCost: assetPurchases.totalCost,
        basePrice: assetPurchases.basePrice,
        warrantyExpiry: assetPurchases.warrantyExpiry,
      })
      .from(assetDisposals)
      .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
      .innerJoin(users, eq(assetDisposals.requestedById, users.id))
      .leftJoin(assetPurchases, eq(assetPurchases.assetId, assets.id))
      .leftJoin(models, eq(assets.modelId, models.id))
      .leftJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(brands, eq(models.brandId, brands.id))
      .where(eq(assetDisposals.id, disposalId))
      .orderBy(desc(assetPurchases.createdAt))
      .limit(1);

    logLatency({
      scope: 'DB ACTION',
      label: 'disposals.getDisposalReviewDetails.query',
      startTime: queryTimer,
      metadata: { disposalId },
    });

    const row = rows[0];
    if (!row) {
      throw new Error('Disposal request not found.');
    }

    const originalCostRaw = row.totalCost ?? row.basePrice ?? null;
    const originalCost =
      originalCostRaw === null ? null : Number(originalCostRaw);

    let warrantyStatus: DisposalReviewDetails['warrantyStatus'] = 'Unknown';
    if (row.warrantyExpiry) {
      const expiry = new Date(row.warrantyExpiry);
      warrantyStatus = expiry.getTime() >= Date.now() ? 'Valid' : 'Expired';
    }

    const details: DisposalReviewDetails = {
      disposalId: row.disposalId,
      assetId: row.assetId,
      assetTag: row.assetTag,
      assetName: row.assetName,
      serialNumber: row.serialNumber,
      category: row.categoryName ?? 'Unknown',
      brand: row.brandName ?? 'Unknown',
      requestedBy: row.requestedBy,
      requestedAt: row.requestedAt.toISOString(),
      reason: row.reason,
      justification: row.justification ?? null,
      dateCreated: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      purchaseDate: row.purchaseDate
        ? new Date(row.purchaseDate).toISOString()
        : null,
      originalCost,
      currentBookValue: null, // Placeholder
      warrantyStatus,
    };

    // Fetch real-time book value from centralized financial module
    try {
      const vitals = await getAssetFinancialVitals(row.assetId);
      details.currentBookValue = vitals.currentBookValue;
    } catch (e) {
      console.warn(
        `[getDisposalReviewDetails] Could not fetch book value for asset ${row.assetId}:`,
        e
      );
    }

    return details;
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'disposals.getDisposalReviewDetails',
      startTime: actionTimer,
    });
  }
}
