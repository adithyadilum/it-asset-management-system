import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
  assets,
  maintenanceTickets,
  systemAuditLogs,
  assetDisposals,
  assetDocuments,
} from '@/db/schema';
import { isValidUuid } from '@/lib/auth/uuid';
import { isSoftwareLicenseNearCapacity } from '@/lib/software-license-status';

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
    vendorCode: string | null;
    companyName: string;
    email: string | null;
    phone: string | null;
    website: string | null;
  } | null;
  owner: {
    id: number;
    companyName: string;
  } | null;
  assignment: {
    id: number;
    assignedToUser: {
      id: string;
      name: string;
      email: string;
    } | null;
    assignedDate: string;
    expectedReturnDate: string | null;
    notes: string | null;
    state: string | null;
  } | null;
  softwareLicense?: {
    id: string;
    licenseKey: string | null;
    licenseType: string;
    totalSeats: number;
    availableSeats: number;
    startDate: string | null;
    expiryDate: string | null;
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
  vendorName: string | null;
  status: string;
  reportedIssue: string;
  rmaNumber: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  estimatedReturnDate: string | null;
  actualCompletionDate: string | null;
  createdAt: string;
}

export interface AllocationData {
  id: string;
  name: string;
  email: string;
  assignedDate: string;
}

export interface DisposalHistoryDetails {
  reason: string;
  flaggedBy: string;
  disposedBy: string | null;
  disposalDate: string | null;
  status: string;
  documentUrls: string[];
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

export async function resolveAssetPrimaryId(
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

  return getAssetDetailsByResolvedId(resolvedAssetId);
}

export async function getAssetDetailsByResolvedId(
  resolvedAssetId: string
): Promise<AssetDetailsData | null> {
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
      softwareLicense: {
        with: {
          allocations: {
            where: (allocations, { isNull }) => isNull(allocations.revokedAt),
            columns: { id: true },
          },
        },
      },
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
            columns: {
              id: true,
              vendorCode: true,
              companyName: true,
              email: true,
              phone: true,
              website: true,
            },
          },
        },
      },
      assignments: {
        where: (assignments, { isNull }) => isNull(assignments.returnedDate),
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

  const result: AssetDetailsData = {
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
          currencyCode: purchaseRecord.currencyCode ?? 'LKR',
          warrantyExpiry: purchaseRecord.warrantyExpiry?.toString() ?? null,
          invoiceUrl: purchaseRecord.invoiceUrl,
          createdAt: formatSafeISO(purchaseRecord.createdAt),
          updatedAt: formatSafeISO(purchaseRecord.updatedAt),
        }
      : null,
    vendor: purchaseRecord?.vendor
      ? {
          id: purchaseRecord.vendor.id,
          vendorCode: purchaseRecord.vendor.vendorCode,
          companyName: purchaseRecord.vendor.companyName,
          email: purchaseRecord.vendor.email,
          phone: purchaseRecord.vendor.phone,
          website: purchaseRecord.vendor.website,
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
          id: assignmentRecord.id,
          assignedToUser: assignmentRecord.assignedToUser,
          assignedDate: formatSafeISO(assignmentRecord.assignedDate),
          expectedReturnDate: assignmentRecord.expectedReturnDate
            ? formatSafeISO(assignmentRecord.expectedReturnDate)
            : null,
          notes: assignmentRecord.notes,
          state: assignmentRecord.state,
        }
      : null,
    softwareLicense: assetRecord.softwareLicense
      ? {
          id: assetRecord.softwareLicense.id,
          licenseKey: assetRecord.softwareLicense.licenseKey,
          licenseType: assetRecord.softwareLicense.licenseType,
          totalSeats: assetRecord.softwareLicense.totalSeats,
          availableSeats: Math.max(
            0,
            assetRecord.softwareLicense.totalSeats -
              (assetRecord.softwareLicense.allocations?.length ?? 0)
          ),
          startDate: assetRecord.softwareLicense.startDate
            ? formatSafeISO(assetRecord.softwareLicense.startDate)
            : null,
          expiryDate: assetRecord.softwareLicense.expiryDate
            ? formatSafeISO(assetRecord.softwareLicense.expiryDate)
            : null,
        }
      : null,
  };

  // Dynamic Status for Software
  if (
    assetRecord.model.category.pillar === 'Software' &&
    result.softwareLicense
  ) {
    const { totalSeats, availableSeats, expiryDate } = result.softwareLicense;
    const expiry = expiryDate ? new Date(expiryDate) : null;
    const isExpired = expiry ? expiry < new Date() : false;
    const isNearExpiry = expiry
      ? expiry < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : false;
    const isFull = totalSeats > 0 && availableSeats <= 0;
    const isNearFull = isSoftwareLicenseNearCapacity(
      totalSeats,
      availableSeats
    );

    if (isExpired) {
      result.asset.status = 'expired';
    } else if (isFull) {
      result.asset.status = 'full';
    } else if (isNearExpiry || isNearFull) {
      result.asset.status = 'warning';
    } else {
      result.asset.status = 'available';
    }
  }

  return result;
}

export async function getAssetHistoryById(id: string): Promise<HistoryEvent[]> {
  const resolvedAssetId = await resolveAssetPrimaryId(id);
  if (!resolvedAssetId) {
    return [];
  }

  return getAssetHistoryByResolvedId(resolvedAssetId);
}

export async function getAssetHistoryByResolvedId(
  resolvedAssetId: string
): Promise<HistoryEvent[]> {
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

  return getAssetMaintenanceByResolvedId(resolvedAssetId);
}

export async function getAssetMaintenanceByResolvedId(
  resolvedAssetId: string
): Promise<MaintenanceEvent[]> {
  const maintenanceList = await db.query.maintenanceTickets.findMany({
    where: eq(maintenanceTickets.assetId, resolvedAssetId),
    orderBy: (records, { desc }) => [desc(records.createdAt)],
    limit: 5,
  });

  return maintenanceList.map((record) => ({
    id: record.id,
    assetId: record.assetId,
    vendorName: record.vendorName,
    status: record.status,
    reportedIssue: record.reportedIssue,
    rmaNumber: record.rmaNumber,
    estimatedCost: record.estimatedCost?.toString() ?? null,
    actualCost: record.actualCost?.toString() ?? null,
    estimatedReturnDate: record.estimatedReturnDate?.toString() ?? null,
    actualCompletionDate: record.actualCompletionDate?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  }));
}

export async function getAssetAllocationsById(
  id: string
): Promise<AllocationData[]> {
  const resolvedAssetId = await resolveAssetPrimaryId(id);
  if (!resolvedAssetId) {
    return [];
  }

  return getAssetAllocationsByResolvedId(resolvedAssetId);
}

export async function getAssetAllocationsByResolvedId(
  resolvedAssetId: string
): Promise<AllocationData[]> {
  const assetRecord = await db.query.assets.findFirst({
    where: eq(assets.id, resolvedAssetId),
    with: {
      assignments: {
        where: (assignments, { isNull }) => isNull(assignments.returnedDate),
        orderBy: (assignments, { desc }) => [desc(assignments.assignedDate)],
        with: {
          assignedToUser: { columns: { id: true, name: true, email: true } },
        },
      },
      softwareLicense: {
        with: {
          allocations: {
            where: (allocations, { isNull }) => isNull(allocations.revokedAt),
            with: {
              assignedToUser: {
                columns: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
    },
  });

  if (!assetRecord) {
    return [];
  }

  const results: AllocationData[] = [];

  // 1. Add Hardware Assignments
  if (assetRecord.assignments) {
    assetRecord.assignments
      .filter((assignment) => assignment.assignedToUser)
      .forEach((assignment) => {
        results.push({
          id: assignment.assignedToUser!.id,
          name: assignment.assignedToUser!.name,
          email: assignment.assignedToUser!.email,
          assignedDate: assignment.assignedDate.toISOString(),
        });
      });
  }

  // 2. Add Software Allocations
  if (assetRecord.softwareLicense?.allocations) {
    assetRecord.softwareLicense.allocations
      .filter((alloc) => alloc.assignedToUser)
      .forEach((alloc) => {
        results.push({
          id: alloc.assignedToUser!.id,
          name: alloc.assignedToUser!.name,
          email: alloc.assignedToUser!.email,
          assignedDate: alloc.allocatedAt.toISOString(),
        });
      });
  }

  return results;
}

export async function getAssetDisposalById(
  id: string
): Promise<DisposalHistoryDetails | null> {
  const resolvedAssetId = await resolveAssetPrimaryId(id);
  if (!resolvedAssetId) {
    return null;
  }

  // Fetch the latest disposal record for this asset
  const disposalRecord = await db.query.assetDisposals.findFirst({
    where: eq(assetDisposals.assetId, resolvedAssetId),
    orderBy: (records, { desc }) => [desc(records.requestedAt)],
    with: {
      requestedBy: { columns: { name: true } },
      approvedBy: { columns: { name: true } },
    },
  });

  if (!disposalRecord) {
    return null;
  }

  // Scoped to this disposal record, not just the asset: an asset disposed more
  // than once would otherwise show every receipt it had ever accumulated.
  const documents = await db.query.assetDocuments.findMany({
    where: and(
      eq(assetDocuments.disposalId, disposalRecord.id),
      eq(assetDocuments.documentType, 'disposal-certificate')
    ),
  });

  return {
    reason: disposalRecord.reason,
    flaggedBy: disposalRecord.requestedBy?.name ?? 'Unknown',
    disposedBy: disposalRecord.approvedBy?.name ?? null,
    disposalDate: disposalRecord.resolvedAt
      ? disposalRecord.resolvedAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null,
    status: disposalRecord.status,
    documentUrls: documents.map((doc) => doc.fileUrl),
  };
}
