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
import { canManageAssets, canViewAssetRegistry } from '@/lib/auth/roles';
import { logError } from '@/lib/latency';
import {
  getAssetAllocationsByResolvedId,
  getAssetDetailsByResolvedId,
  getAssetHistoryByResolvedId,
  getAssetMaintenanceByResolvedId,
  resolveAssetPrimaryId,
  type AllocationData,
  type AssetDetailsData,
  type HistoryEvent,
  type MaintenanceEvent,
} from '@/lib/data/asset-details-repo';
import {
  getAssetFinancialVitalsByResolvedId,
  type AssetFinancialVitals,
} from '@/lib/data/asset-financial-vitals-repo';

export interface AssetPanelData {
  details: AssetDetailsData | null;
  history: HistoryEvent[];
  maintenance: MaintenanceEvent[];
  allocations: AllocationData[];
  financial: AssetFinancialVitals | null;
}

/**
 * Loads the complete details panel through one Server Action. This avoids five
 * HTTP requests, repeated authorization lookups, and repeated asset-tag
 * resolution while preserving field-level financial authorization.
 */
export async function getAssetPanelDataAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user || !canViewAssetRegistry(user.role)) {
    return { success: false as const, message: 'Forbidden', data: null };
  }

  try {
    const resolvedAssetId = await resolveAssetPrimaryId(id);
    if (!resolvedAssetId) {
      return {
        success: false as const,
        message: 'Asset not found.',
        data: null,
      };
    }

    const canViewFinancials =
      user.role === 'GlobalAdmin' || user.role === 'FinancialAuditor';
    const [details, history, maintenance, allocations, financial] =
      await Promise.all([
        getAssetDetailsByResolvedId(resolvedAssetId),
        getAssetHistoryByResolvedId(resolvedAssetId),
        getAssetMaintenanceByResolvedId(resolvedAssetId),
        getAssetAllocationsByResolvedId(resolvedAssetId),
        canViewFinancials
          ? getAssetFinancialVitalsByResolvedId(resolvedAssetId)
          : Promise.resolve(null),
      ]);

    return {
      success: true as const,
      data: { details, history, maintenance, allocations, financial },
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'panels.getAssetPanelDataAction',
      error,
    });
    return {
      success: false as const,
      message: 'Failed to load asset panel data.',
      data: null,
    };
  }
}

export async function getAssetDetailsByIdAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user || !canViewAssetRegistry(user.role)) {
    return { success: false, message: 'Forbidden', data: null };
  }

  try {
    const { getAssetDetailsById } =
      await import('@/lib/data/asset-details-repo');
    const details = await getAssetDetailsById(id);
    return { success: true, data: details };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'panels.getAssetDetailsByIdAction',
      error,
    });
    return {
      success: false,
      message: 'Failed to load asset details.',
      data: null,
    };
  }
}

export async function getAssetHistoryByIdAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user || !canViewAssetRegistry(user.role)) {
    return { success: false, message: 'Forbidden', data: [] };
  }

  try {
    const { getAssetHistoryById } =
      await import('@/lib/data/asset-details-repo');
    const history = await getAssetHistoryById(id);
    return { success: true, data: history };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'panels.getAssetHistoryByIdAction',
      error,
    });
    return {
      success: false,
      message: 'Failed to load asset history.',
      data: [],
    };
  }
}

export async function getAssetMaintenanceByIdAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user || !canViewAssetRegistry(user.role)) {
    return { success: false, message: 'Forbidden', data: [] };
  }

  try {
    const { getAssetMaintenanceById } =
      await import('@/lib/data/asset-details-repo');
    const maintenance = await getAssetMaintenanceById(id);
    return { success: true, data: maintenance };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'panels.getAssetMaintenanceByIdAction',
      error,
    });
    return {
      success: false,
      message: 'Failed to load maintenance records.',
      data: [],
    };
  }
}

export async function getAssetAllocationsAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user || !canViewAssetRegistry(user.role)) {
    return { success: false, message: 'Forbidden', data: [] };
  }

  try {
    const { getAssetAllocationsById } =
      await import('@/lib/data/asset-details-repo');
    const allocations = await getAssetAllocationsById(id);
    return { success: true, data: allocations };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'panels.getAssetAllocationsAction',
      error,
    });
    return {
      success: false,
      message: 'Failed to load allocation history.',
      data: [],
    };
  }
}

export async function getAssetDisposalAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user || !canViewAssetRegistry(user.role)) {
    return { success: false, message: 'Forbidden', data: null };
  }

  try {
    const { getAssetDisposalById } =
      await import('@/lib/data/asset-details-repo');
    const disposal = await getAssetDisposalById(id);
    return { success: true, data: disposal };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'panels.getAssetDisposalAction',
      error,
    });
    return {
      success: false,
      message: 'Failed to load disposal record.',
      data: null,
    };
  }
}

export async function getRegistrationOptionsAction(pillar: string) {
  const user = await getAuthenticatedUser();
  if (!user || !canManageAssets(user.role)) {
    return { success: false, message: 'Forbidden', data: null };
  }

  try {
    const pillarValue = pillar as (typeof pillarEnum.enumValues)[number];

    const [
      categoriesList,
      brandsList,
      modelsList,
      vendorsList,
      ownersList,
      locationsList,
    ] = await Promise.all([
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
            db
              .select({ id: categories.id })
              .from(categories)
              .where(eq(categories.pillar, pillarValue))
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
            // Deep clone JSONB to remove [Object: null prototype] which breaks Next.js Server Actions
            customSchema: c.customSchema
              ? JSON.parse(JSON.stringify(c.customSchema))
              : null,
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
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'panels.getRegistrationOptionsAction',
      error,
    });
    return {
      success: false,
      message: 'Failed to load registration options.',
      data: null,
    };
  }
}

export async function getEditDropdownOptionsAction() {
  const user = await getAuthenticatedUser();
  if (!user || !canManageAssets(user.role)) {
    return { success: false, message: 'Forbidden', data: null };
  }

  try {
    const [locationsList, ownersList] = await Promise.all([
      db.query.locations.findMany({
        where: eq(locations.isActive, true),
        columns: { id: true, name: true },
      }),
      db.query.owners.findMany({
        where: eq(owners.isActive, true),
        columns: { id: true, companyName: true },
      }),
    ]);

    return {
      success: true,
      data: {
        locations: locationsList.map((l: { id: number; name: string }) => ({
          value: String(l.id),
          label: l.name,
        })),
        owners: ownersList.map((o: { id: number; companyName: string }) => ({
          value: String(o.id),
          label: o.companyName,
        })),
      },
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'panels.getEditDropdownOptionsAction',
      error,
    });
    return {
      success: false,
      message: 'Failed to load dropdown options.',
      data: null,
    };
  }
}
