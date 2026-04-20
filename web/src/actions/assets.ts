'use server';

import { db } from '@/db';
import { assets, systemAuditLogs, maintenanceRecords } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// =============================================================================
// TYPES
// =============================================================================

export interface AssetDetailsData {
  asset: {
    id: string;
    assetTag: string;
    serialNumber: string | null;
    name: string | null;
    status: string;
    condition: string | null;
    instanceAttributes: Record<string, unknown> | null;
    usefulLifeMonths: number | null;
    salvageValue: string | null;
    createdAt: string; // Changed to string
    updatedAt: string; // Changed to string
  };
  model: {
    id: number;
    name: string;
    technicalDetails: Record<string, unknown> | null;
    brand: { id: number; name: string; };
    category: {
      id: number;
      name: string;
      pillar: string;
      prefix: string;
      customSchema: Record<string, unknown> | null;
    };
  };
  location: {
    id: number;
    name: string;
    type: string | null;
  } | null;
  purchase: {
    id: number;
    purchaseDate: string | null;
    basePrice: string | null;
    tax: string | null;
    shippingCost: string | null;
    totalCost: string | null;
    currencyCode: string;
    warrantyExpiry: string | null;
    invoiceUrl: string | null;
    createdAt: string; // Changed to string
  } | null;
  vendor: {
    id: number;
    companyName: string;
    contactInfo: string | null;
  } | null;
  assignment: {
    assignedToUser: {
      id: string;
      name: string;
      email: string;
    } | null;
    assignedDate: string; // Changed to string
    expectedReturnDate: string | null;
    notes: string | null;
  } | null;
}

export interface HistoryEvent {
  id: string;
  timestamp: string;
  eventType: string;
  actor: string;
  description: string;
  details?: string;
}

export interface MaintenanceEvent {
  id: number;
  assetId: string;
  vendorId: number | null;
  status: string;
  description: string;
  rmaTicketNumber: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  serviceDate: string | null;
  closedAt: string | null; // Changed to string
  createdAt: string;       // Changed to string
  vendor: { companyName: string; } | null;
}

const ACTION_TYPE_MAP: Record<string, string> = {
  UPDATE: 'Status Updated', CREATE: 'Asset Created', ASSIGN: 'Asset Assigned',
  RETURN: 'Asset Transferred', MAINTENANCE: 'Maintenance Initiated', DELETE: 'Asset Deleted',
};

const ACTION_DESCRIPTION_MAP: Record<string, string> = {
  UPDATE: 'Asset information was updated', CREATE: 'Asset was created in the system',
  ASSIGN: 'Asset was assigned to a user', RETURN: 'Asset was returned or transferred',
  MAINTENANCE: 'Maintenance was initiated', DELETE: 'Asset was deleted',
};

export async function getAssetDetails(assetTag: string): Promise<AssetDetailsData | null> {
  try {
    if (!assetTag || typeof assetTag !== 'string') throw new Error('Invalid asset tag');

    const assetRecord = await db.query.assets.findFirst({
      where: eq(assets.assetTag, assetTag),
      with: {
        model: {
          with: {
            brand: { columns: { id: true, name: true } },
            category: { columns: { id: true, name: true, pillar: true, prefix: true, customSchema: true } },
          },
        },
        location: { columns: { id: true, name: true, type: true } },
        purchases: { limit: 1, with: { vendor: { columns: { id: true, companyName: true, contactInfo: true } } } },
        assignments: {
          limit: 1, orderBy: (assignments, { desc }) => [desc(assignments.assignedDate)],
          with: { assignedToUser: { columns: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!assetRecord) return null;

    const purchaseRecord = assetRecord.purchases?.[0];
    const assignmentRecord = assetRecord.assignments?.[0];

    return {
      asset: {
        id: assetRecord.id,
        assetTag: assetRecord.assetTag,
        serialNumber: assetRecord.serialNumber,
        name: assetRecord.name,
        status: assetRecord.status,
        condition: assetRecord.condition,
        instanceAttributes: assetRecord.instanceAttributes as Record<string, unknown> | null,
        usefulLifeMonths: assetRecord.usefulLifeMonths,
        salvageValue: assetRecord.salvageValue?.toString() ?? null,
        createdAt: assetRecord.createdAt.toISOString(),
        updatedAt: assetRecord.updatedAt.toISOString(),
      },
      model: {
        id: assetRecord.model.id,
        name: assetRecord.model.name,
        technicalDetails: assetRecord.model.technicalDetails as Record<string, unknown> | null,
        brand: { id: assetRecord.model.brand.id, name: assetRecord.model.brand.name },
        category: {
          id: assetRecord.model.category.id,
          name: assetRecord.model.category.name,
          pillar: assetRecord.model.category.pillar,
          prefix: assetRecord.model.category.prefix,
          customSchema: assetRecord.model.category.customSchema as Record<string, unknown> | null,
        },
      },
      location: assetRecord.location ? { id: assetRecord.location.id, name: assetRecord.location.name, type: assetRecord.location.type } : null,
      purchase: purchaseRecord ? {
        id: purchaseRecord.id,
        purchaseDate: purchaseRecord.purchaseDate?.toString() ?? null,
        basePrice: purchaseRecord.basePrice?.toString() ?? null,
        tax: purchaseRecord.tax?.toString() ?? null,
        shippingCost: purchaseRecord.shippingCost?.toString() ?? null,
        totalCost: purchaseRecord.totalCost?.toString() ?? null,
        currencyCode: purchaseRecord.currencyCode ?? 'USD',
        warrantyExpiry: purchaseRecord.warrantyExpiry?.toString() ?? null,
        invoiceUrl: purchaseRecord.invoiceUrl,
        createdAt: purchaseRecord.createdAt.toISOString(),
      } : null,
      vendor: purchaseRecord?.vendor ? { id: purchaseRecord.vendor.id, companyName: purchaseRecord.vendor.companyName, contactInfo: purchaseRecord.vendor.contactInfo } : null,
      assignment: assignmentRecord ? {
        assignedToUser: assignmentRecord.assignedToUser ? { id: assignmentRecord.assignedToUser.id, name: assignmentRecord.assignedToUser.name, email: assignmentRecord.assignedToUser.email } : null,
        assignedDate: assignmentRecord.assignedDate.toISOString(),
        expectedReturnDate: assignmentRecord.expectedReturnDate?.toString() ?? null,
        notes: assignmentRecord.notes,
      } : null,
    };
  } catch (error) {
    console.error('Error fetching asset details:', error);
    throw new Error('Failed to fetch asset details');
  }
}

export async function getAssetHistory(assetTag: string): Promise<HistoryEvent[]> {
  try {
    if (!assetTag || typeof assetTag !== 'string') throw new Error('Invalid asset tag');
    const asset = await db.query.assets.findFirst({ where: eq(assets.assetTag, assetTag), columns: { id: true } });
    if (!asset) return [];

    const auditRecords = await db.query.systemAuditLogs.findMany({
      where: and(eq(systemAuditLogs.entityType, 'Asset'), eq(systemAuditLogs.entityId, asset.id)),
      orderBy: (logs, { desc }) => [desc(logs.performedAt)],
      limit: 20,
      with: { performedBy: { columns: { id: true, name: true, role: true } } },
    });

    return auditRecords.map((record) => ({
      id: record.id.toString(),
      timestamp: formatTimestamp(record.performedAt),
      eventType: ACTION_TYPE_MAP[record.actionType] || 'Status Updated',
      actor: `${record.performedBy?.name || 'Unknown'} (${record.performedBy?.role || 'User'})`,
      description: ACTION_DESCRIPTION_MAP[record.actionType] || 'Asset was modified',
      details: formatAuditDetails(record.oldValue as Record<string, unknown> | null, record.newValue as Record<string, unknown> | null),
    }));
  } catch (error) {
    console.error('Error fetching asset history:', error);
    return [];
  }
}

export async function getAssetMaintenance(assetTag: string): Promise<MaintenanceEvent[]> {
  try {
    if (!assetTag || typeof assetTag !== 'string') throw new Error('Invalid asset tag');
    const asset = await db.query.assets.findFirst({ where: eq(assets.assetTag, assetTag), columns: { id: true } });
    if (!asset) return [];

    const maintenanceList = await db.query.maintenanceRecords.findMany({
      where: eq(maintenanceRecords.assetId, asset.id),
      orderBy: (records, { desc }) => [desc(records.createdAt)],
      limit: 5,
      with: { vendor: { columns: { companyName: true } } },
    });

    return maintenanceList.map((record) => ({
      id: record.id,
      assetId: record.assetId,
      vendorId: record.vendorId,
      status: record.status,
      description: record.description,
      rmaTicketNumber: record.rmaTicketNumber,
      estimatedCost: record.estimatedCost?.toString() ?? null,
      actualCost: record.actualCost?.toString() ?? null,
      serviceDate: record.serviceDate?.toString() ?? null,
      closedAt: record.closedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      vendor: record.vendor,
    }));
  } catch (error) {
    console.error('Error fetching asset maintenance:', error);
    return [];
  }
}

export async function updateAsset(
  assetId: string,
  data: { status?: 'Available' | 'Assigned' | 'In Repair' | 'Defective' | 'Lost' | 'Retired' | 'Disposed'; condition?: 'New' | 'Excellent' | 'Fair' | 'Poor' | 'Damaged' | null; name?: string | null; locationId?: number | null; instanceAttributes?: Record<string, unknown> | null; },
  userId: string
): Promise<unknown> {
  try {
    if (!assetId || !userId) throw new Error('Invalid IDs');
    const validFields = ['status', 'condition', 'name', 'locationId', 'instanceAttributes'];
    if (!Object.keys(data).some((key) => validFields.includes(key))) throw new Error('No valid fields');

    const currentAsset = await db.query.assets.findFirst({ where: eq(assets.id, assetId) });
    if (!currentAsset) throw new Error('Asset not found');

    const updatedAsset = await db.update(assets).set({ ...data, updatedAt: new Date() }).where(eq(assets.id, assetId)).returning();
    if (updatedAsset[0]) await logAuditChange(assetId, userId, currentAsset, updatedAsset[0]);

    return updatedAsset[0] ?? null;
  } catch (error) {
    console.error('Error updating asset:', error);
    throw new Error('Failed to update asset');
  }
}

function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatAuditDetails(oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null): string {
  if (!oldValue || !newValue) return '';
  const changes: string[] = [];
  if (oldValue.status !== newValue.status) changes.push(`Status: ${oldValue.status} → ${newValue.status}`);
  if (oldValue.condition !== newValue.condition) changes.push(`Condition: ${oldValue.condition} → ${newValue.condition}`);
  if (oldValue.locationId !== newValue.locationId) changes.push(`Location changed`);
  return changes.join(', ');
}

async function logAuditChange(assetId: string, userId: string, oldValue: unknown, newValue: unknown): Promise<void> {
  try {
    await db.insert(systemAuditLogs).values({
      entityType: 'Asset', entityId: assetId, actionType: 'UPDATE', performedById: userId,
      oldValue: oldValue as Record<string, unknown> | null, newValue: newValue as Record<string, unknown> | null,
    });
  } catch (error) {
    console.error('Failed to log audit change:', error);
  }
}