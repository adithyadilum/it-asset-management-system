import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { assets, maintenanceRecords, systemAuditLogs } from '@/db/schema';
import { isValidUuid } from '@/lib/auth/uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
    createdAt: string;
    updatedAt: string;
  };
  model: {
    id: number;
    name: string;
    imageUrl: string | null;
    technicalDetails: Record<string, unknown> | null;
    brand: { id: number; name: string };
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
    vendorId: number | null;
    purchaseDate: string | null;
    basePrice: string | null;
    tax: string | null;
    shippingCost: string | null;
    totalCost: string | null;
    currencyCode: string;
    warrantyExpiry: string | null;
    invoiceUrl: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  vendor: {
    id: number;
    companyName: string;
    contactInfo: string | null;
  } | null;
  owner: {
    id: number;
    companyName: string;
  } | null;
  assignment: {
    assignedToUser: {
      id: string;
      name: string;
      email: string;
    } | null;
    assignedDate: string;
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
  closedAt: string | null;
  createdAt: string;
  vendor: { companyName: string } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_TYPE_MAP: Record<string, string> = {
  UPDATE: 'Status Updated',
  CREATE: 'Asset Created',
  ASSIGN: 'Asset Assigned',
  RETURN: 'Asset Transferred',
  MAINTENANCE: 'Maintenance Initiated',
  DELETE: 'Asset Deleted',
};

const ACTION_DESCRIPTION_MAP: Record<string, string> = {
  UPDATE: 'Asset information was updated',
  CREATE: 'Asset was created in the system',
  ASSIGN: 'Asset was assigned to a user',
  RETURN: 'Asset was returned or transferred',
  MAINTENANCE: 'Maintenance was initiated',
  DELETE: 'Asset was deleted',
};

function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAuditDetails(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): string {
  if (!oldValue || !newValue) {
    return '';
  }

  const changes: string[] = [];

  if (oldValue.status !== newValue.status) {
    changes.push(`Status: ${oldValue.status} -> ${newValue.status}`);
  }

  if (oldValue.condition !== newValue.condition) {
    changes.push(`Condition: ${oldValue.condition} -> ${newValue.condition}`);
  }

  if (oldValue.locationId !== newValue.locationId) {
    changes.push('Location changed');
  }

  return changes.join(', ');
}

function formatSafeISO(val: unknown): string {
  if (!val) return new Date().toISOString();
  try {
    const d = val instanceof Date ? val : new Date(String(val));
    return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

async function resolveAssetPrimaryId(
  identifier: string
): Promise<string | null> {
  const normalizedIdentifier = identifier.trim();
  if (normalizedIdentifier.length === 0) {
    return null;
  }

  if (isValidUuid(normalizedIdentifier)) {
    return normalizedIdentifier;
  }

  const [assetRecord] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.assetTag, normalizedIdentifier))
    .limit(1);

  return assetRecord?.id ?? null;
}

// ---------------------------------------------------------------------------
// Read Queries
// ---------------------------------------------------------------------------

export async function getAssetDetailsById(
  id: string
): Promise<AssetDetailsData | null> {
  const resolvedAssetId = await resolveAssetPrimaryId(id);
  if (!resolvedAssetId) {
    return null;
  }

  const assetRecord = await db.query.assets.findFirst({
    where: eq(assets.id, resolvedAssetId),
    with: {
      model: {
        with: {
          brand: { columns: { id: true, name: true } },
          category: {
            columns: {
              id: true,
              name: true,
              pillar: true,
              prefix: true,
              customSchema: true,
            },
          },
        },
        columns: {
          id: true,
          name: true,
          technicalDetails: true,
          imageUrl: true,
        },
      },
      location: { columns: { id: true, name: true, type: true } },
      owner: { columns: { id: true, companyName: true } },
      purchases: {
        limit: 1,
        columns: {
          id: true,
          assetId: true,
          vendorId: true,
          purchaseDate: true,
          basePrice: true,
          tax: true,
          shippingCost: true,
          totalCost: true,
          currencyCode: true,
          warrantyExpiry: true,
          invoiceUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          vendor: {
            columns: { id: true, companyName: true, email: true, phone: true },
          },
        },
      },
      assignments: {
        limit: 1,
        orderBy: (assignments, { desc }) => [desc(assignments.assignedDate)],
        with: {
          assignedToUser: { columns: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!assetRecord) {
    return null;
  }

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
      instanceAttributes: assetRecord.instanceAttributes as Record<
        string,
        unknown
      > | null,
      usefulLifeMonths: assetRecord.usefulLifeMonths,
      salvageValue: assetRecord.salvageValue?.toString() ?? null,
      createdAt: assetRecord.createdAt.toISOString(),
      updatedAt: assetRecord.updatedAt.toISOString(),
    },
    model: {
      id: assetRecord.model.id,
      name: assetRecord.model.name,
      imageUrl: assetRecord.model.imageUrl,
      technicalDetails: assetRecord.model.technicalDetails as Record<
        string,
        unknown
      > | null,
      brand: {
        id: assetRecord.model.brand.id,
        name: assetRecord.model.brand.name,
      },
      category: {
        id: assetRecord.model.category.id,
        name: assetRecord.model.category.name,
        pillar: assetRecord.model.category.pillar,
        prefix: assetRecord.model.category.prefix,
        customSchema: assetRecord.model.category.customSchema as Record<
          string,
          unknown
        > | null,
      },
    },
    location: assetRecord.location
      ? {
          id: assetRecord.location.id,
          name: assetRecord.location.name,
          type: assetRecord.location.type,
        }
      : null,
    purchase: purchaseRecord
      ? {
          id: purchaseRecord.id,
          vendorId: purchaseRecord.vendorId,
          purchaseDate: purchaseRecord.purchaseDate?.toString() ?? null,
          basePrice: purchaseRecord.basePrice?.toString() ?? null,
          tax: purchaseRecord.tax?.toString() ?? null,
          shippingCost: purchaseRecord.shippingCost?.toString() ?? null,
          totalCost: purchaseRecord.totalCost?.toString() ?? null,
          currencyCode: purchaseRecord.currencyCode ?? 'USD',
          warrantyExpiry: purchaseRecord.warrantyExpiry?.toString() ?? null,
          invoiceUrl: purchaseRecord.invoiceUrl,
          createdAt: formatSafeISO(purchaseRecord.createdAt),
          updatedAt: formatSafeISO(purchaseRecord.updatedAt),
        }
      : null,
    vendor: purchaseRecord?.vendor
      ? {
          id: purchaseRecord.vendor.id,
          companyName: purchaseRecord.vendor.companyName,
          contactInfo:
            purchaseRecord.vendor.email ?? purchaseRecord.vendor.phone ?? null,
        }
      : null,
    owner: assetRecord.owner
      ? {
          id: assetRecord.owner.id,
          companyName: assetRecord.owner.companyName,
        }
      : null,
    assignment: assignmentRecord
      ? {
          assignedToUser: assignmentRecord.assignedToUser
            ? {
                id: assignmentRecord.assignedToUser.id,
                name: assignmentRecord.assignedToUser.name,
                email: assignmentRecord.assignedToUser.email,
              }
            : null,
          assignedDate: assignmentRecord.assignedDate.toISOString(),
          expectedReturnDate:
            assignmentRecord.expectedReturnDate?.toString() ?? null,
          notes: assignmentRecord.notes,
        }
      : null,
  };
}

export async function getAssetHistoryById(id: string): Promise<HistoryEvent[]> {
  const resolvedAssetId = await resolveAssetPrimaryId(id);
  if (!resolvedAssetId) {
    return [];
  }

  const auditRecords = await db.query.systemAuditLogs.findMany({
    where: and(
      eq(systemAuditLogs.entityType, 'Asset'),
      eq(systemAuditLogs.entityId, resolvedAssetId)
    ),
    orderBy: (logs, { desc }) => [desc(logs.performedAt)],
    limit: 20,
    with: { performedBy: { columns: { id: true, name: true, role: true } } },
  });

  return auditRecords.map((record) => ({
    id: String(record.id),
    timestamp: formatTimestamp(record.performedAt),
    eventType: ACTION_TYPE_MAP[record.actionType] ?? 'Status Updated',
    actor: `${record.performedBy?.name ?? 'Unknown'} (${record.performedBy?.role ?? 'User'})`,
    description:
      ACTION_DESCRIPTION_MAP[record.actionType] ?? 'Asset was modified',
    details: formatAuditDetails(
      record.oldValue as Record<string, unknown> | null,
      record.newValue as Record<string, unknown> | null
    ),
  }));
}

export async function getAssetMaintenanceById(
  id: string
): Promise<MaintenanceEvent[]> {
  const resolvedAssetId = await resolveAssetPrimaryId(id);
  if (!resolvedAssetId) {
    return [];
  }

  const maintenanceList = await db.query.maintenanceRecords.findMany({
    where: eq(maintenanceRecords.assetId, resolvedAssetId),
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
}
