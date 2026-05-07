'use server';

import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/db';
import {
  assetAssignments,
  assets,
  categories,
  locations,
  models,
  users,
} from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import type { ReportPreviewRow } from '@/components/features/reports/standard-reports/standard-reports-types';
import { customStatuses } from '@/db/schema';

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface ReportPreviewFilters {
  category?: string;
  location?: string;
  status?: string;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

export async function getStandardReportsFilterOptions() {
  const [dbLocations, dbCustomStatuses] = await Promise.all([
    db
      .select({ name: locations.name })
      .from(locations)
      .where(eq(locations.isActive, true)),
    db
      .select({ name: customStatuses.name })
      .from(customStatuses)
      .where(eq(customStatuses.isActive, true)),
  ]);

  const defaultStatuses = [
    'Available',
    'Assigned',
    'In Repair',
    'Defective',
    'Lost',
    'Retired',
    'Pending Disposal',
    'Disposed',
  ];

  return {
    categories: ['All categories', 'Hardware', 'Software', 'Electronics', 'Furniture'],
    locations: ['All locations', ...Array.from(new Set(dbLocations.map((l) => l.name))).sort()],
    statuses: ['All statuses', ...defaultStatuses, ...Array.from(new Set(dbCustomStatuses.map((s) => s.name))).sort()],
  };
}

export async function fetchReportPreview(
  filters: ReportPreviewFilters
): Promise<ReportPreviewRow[]> {
  const actionTimer = startLatencyTimer();

  const currentUser = await getAuthenticatedUser();
  if (!currentUser || !canManageAssets(currentUser.role)) {
    throw new Error(
      'Forbidden: You do not have permission to generate reports.'
    );
  }

  try {
    // Build dynamic where conditions
    const conditions = [];

    // Category filter — map frontend generic names to DB pillars
    if (filters.category && filters.category !== 'All categories') {
      let dbPillar = filters.category;
      if (dbPillar === 'Hardware') dbPillar = 'IT & Digital';
      if (dbPillar === 'Furniture') dbPillar = 'Office Furniture';
      if (dbPillar === 'Electronics') dbPillar = 'Office Electronics';
      
      conditions.push(eq(categories.pillar, dbPillar as never));
    }

    // Location filter
    if (filters.location && filters.location !== 'All locations') {
      conditions.push(eq(locations.name, filters.location));
    }

    // Status filter
    if (filters.status && filters.status !== 'All statuses') {
      conditions.push(eq(assets.status, filters.status));
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    const queryTimer = startLatencyTimer();

    const rows = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        name: assets.name,
        category: categories.name,
        locationId: assets.locationId,
        status: assets.status,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(locations, eq(assets.locationId, locations.id))
      .where(whereCondition)
      .orderBy(desc(assets.updatedAt), asc(assets.assetTag));

    logLatency({
      scope: 'DB ACTION',
      label: 'standardReports.fetchReportPreview.query',
      startTime: queryTimer,
    });

    // Resolve assigned users for each asset (same pattern as asset-registry-repo)
    const assetIds = rows.map((row) => row.id);
    const assignedUserByAssetId = new Map<string, string>();

    if (assetIds.length > 0) {
      const activeAssignments = await db
        .select({
          assetId: assetAssignments.assetId,
          assignedTo: users.name,
        })
        .from(assetAssignments)
        .leftJoin(users, eq(assetAssignments.assignedToUserId, users.id))
        .where(
          and(
            inArray(assetAssignments.assetId, assetIds),
            isNull(assetAssignments.returnedDate)
          )
        )
        .orderBy(desc(assetAssignments.assignedDate));

      for (const assignment of activeAssignments) {
        if (
          !assignedUserByAssetId.has(assignment.assetId) &&
          assignment.assignedTo
        ) {
          assignedUserByAssetId.set(
            assignment.assetId,
            assignment.assignedTo
          );
        }
      }
    }

    const data: ReportPreviewRow[] = rows.map((row) => ({
      id: row.id,
      assetTag: row.assetTag,
      name: row.name,
      category: row.category,
      assignedTo: assignedUserByAssetId.get(row.id) ?? null,
      status: row.status,
    }));

    return data;
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'standardReports.fetchReportPreview',
      error,
    });
    throw new Error('Failed to fetch report preview data.');
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'standardReports.fetchReportPreview',
      startTime: actionTimer,
    });
  }
}
