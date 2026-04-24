import { desc, eq, isNotNull } from 'drizzle-orm';

import { getAssetsByPillar } from '@/actions/asset-registry';
import { db } from '@/db';
import {
  assetAssignments,
  assets,
  categories,
  locations,
  models,
  users,
} from '@/db/schema';
import type { AssetRegistryRow, AssetStatus } from '@/lib/data/asset-registry-repo';

export type AssignmentsDashboardTab = 'available' | 'assigned' | 'returned';

export interface AssignmentsDashboardRow {
  id: string;
  assetTag: string;
  name: string | null;
  serialNumber: string | null;
  category: string;
  pillar: string;
  status: AssetStatus | 'Returned';
  location: string | null;
  assignedTo: string | null;
  returnedDate: Date | null;
}

export interface AssignmentsDashboardData {
  available: AssignmentsDashboardRow[];
  assigned: AssignmentsDashboardRow[];
  returned: AssignmentsDashboardRow[];
}

const DASHBOARD_PILLAR = 'IT & Digital';
const BULK_PAGE_SIZE = 100;

function toDashboardRow(row: AssetRegistryRow): AssignmentsDashboardRow {
  return {
    id: row.id,
    assetTag: row.assetTag,
    name: row.name,
    serialNumber: row.serialNumber,
    category: row.category,
    pillar: row.pillar,
    status: row.status,
    location: row.location,
    assignedTo: row.assignedTo,
    returnedDate: null,
  };
}

async function loadAssetsByStatus(status: AssetStatus): Promise<AssignmentsDashboardRow[]> {
  const firstPage = await getAssetsByPillar({
    pillar: DASHBOARD_PILLAR,
    status,
    page: 1,
    pageSize: BULK_PAGE_SIZE,
  });

  let rows = firstPage.data.map(toDashboardRow);

  for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
    const nextPage = await getAssetsByPillar({
      pillar: DASHBOARD_PILLAR,
      status,
      page,
      pageSize: BULK_PAGE_SIZE,
    });

    rows = rows.concat(nextPage.data.map(toDashboardRow));
  }

  return rows;
}

async function loadReturnedAssets(): Promise<AssignmentsDashboardRow[]> {
  const returnedAssignments = await db
    .select({
      assetId: assetAssignments.assetId,
      assetTag: assets.assetTag,
      name: assets.name,
      serialNumber: assets.serialNumber,
      category: categories.name,
      pillar: categories.pillar,
      location: locations.name,
      assignedTo: users.name,
      returnedDate: assetAssignments.returnedDate,
      assignedDate: assetAssignments.assignedDate,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .innerJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(locations, eq(assets.locationId, locations.id))
    .leftJoin(users, eq(assetAssignments.assignedToUserId, users.id))
    .where(isNotNull(assetAssignments.returnedDate))
    .orderBy(desc(assetAssignments.returnedDate), desc(assetAssignments.assignedDate));

  const returnedRowsByAssetId = new Map<string, AssignmentsDashboardRow>();

  for (const record of returnedAssignments) {
    if (returnedRowsByAssetId.has(record.assetId)) {
      continue;
    }

    returnedRowsByAssetId.set(record.assetId, {
      id: record.assetId,
      assetTag: record.assetTag,
      name: record.name,
      serialNumber: record.serialNumber,
      category: record.category,
      pillar: record.pillar,
      status: 'Returned',
      location: record.location,
      assignedTo: record.assignedTo,
      returnedDate: record.returnedDate,
    });
  }

  return [...returnedRowsByAssetId.values()];
}

export async function getAssignmentsDashboardData(): Promise<AssignmentsDashboardData> {
  const [available, assigned, returned] = await Promise.all([
    loadAssetsByStatus('Available'),
    loadAssetsByStatus('Assigned'),
    loadReturnedAssets(),
  ]);

  return {
    available,
    assigned,
    returned,
  };
}