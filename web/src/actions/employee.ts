'use server';

import { and, desc, eq, isNull } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import { assetAssignments, assets, models } from '@/db/schema';

export type EmployeeAssignedAsset = {
  assignmentId: number;
  assetId: string;
  assetTag: string;
  serialNumber: string | null;
  modelName: string;
  status: string;
  assignedDate: string;
};

/**
 * Returns active asset assignments for the currently authenticated employee.
 */
export async function getCurrentEmployeeAssets(): Promise<
  EmployeeAssignedAsset[]
> {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser || currentUser.role !== 'Employee') {
    return [];
  }

  const rows = await db
    .select({
      assignmentId: assetAssignments.id,
      assetId: assets.id,
      assetTag: assets.assetTag,
      serialNumber: assets.serialNumber,
      modelName: models.name,
      status: assets.status,
      assignedDate: assetAssignments.assignedDate,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .innerJoin(models, eq(assets.modelId, models.id))
    .where(
      and(
        eq(assetAssignments.assignedToUserId, currentUser.id),
        isNull(assetAssignments.returnedDate)
      )
    )
    .orderBy(desc(assetAssignments.assignedDate));

  return rows.map((row) => ({
    ...row,
    assignedDate: row.assignedDate.toISOString(),
  }));
}