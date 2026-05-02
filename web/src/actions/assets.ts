'use server';

import { eq, like, sql, and, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import {
  assetPurchases,
  assets,
  categories,
  brands,
  locations,
  models,
  owners,
  vendors,
  assetAssignments,
} from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { logAuditAction, logAuditActionTx } from '@/lib/audit';
import { isValidUuid } from '@/lib/auth/uuid';
import {
  WORKFLOW_GATED_STATUSES,
  STATUSES_REQUIRING_ASSIGNMENT_CLOSURE,
} from '@/lib/constants';
import { getManualOverrideStatuses } from '@/actions/statuses';
import {
  getAssetDetailsById,
  getAssetHistoryById,
  getAssetMaintenanceById,
} from '@/lib/data/asset-details-repo';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import {
  assetRegistrationSchema,
  PILLAR_PREFIX_MAP,
  type RegisterAssetActionState,
} from '@/lib/validations/asset-registration';
import { isInvoiceAttachmentFile } from '@/lib/file-types';
import { uploadFileToStorage } from '@/lib/storage';

// Re-export repo types for consumers
export type {
  AssetDetailsData,
  HistoryEvent,
  MaintenanceEvent,
} from '@/lib/data/asset-details-repo';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_INVOICE_FILE_SIZE_BYTES = Math.floor(4.5 * 1024 * 1024);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toFormValue(formData: FormData, key: string) {
  const rawValue = formData.get(key);
  return typeof rawValue === 'string' ? rawValue : '';
}

function toFormFile(formData: FormData, key: string) {
  const rawValue = formData.get(key);

  if (!(rawValue instanceof File)) {
    return null;
  }

  if (rawValue.size === 0 || rawValue.name.trim().length === 0) {
    return null;
  }

  return rawValue;
}

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addMonths(value: Date, months: number) {
  const nextDate = new Date(value);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function formatSequence(value: number) {
  return String(value).padStart(3, '0');
}

function buildAssetTag(
  pillarPrefix: string,
  categoryPrefix: string,
  sequence: number
) {
  return `${pillarPrefix}-${categoryPrefix}-${formatSequence(sequence)}`;
}

function validateInvoiceFile(file: File | null) {
  if (!file) {
    return null;
  }

  if (file.size > MAX_INVOICE_FILE_SIZE_BYTES) {
    return 'Invoice attachment must be 4.5MB or smaller.';
  }

  if (!isInvoiceAttachmentFile(file)) {
    return 'Invoice attachment must be a supported document or image file.';
  }

  return null;
}

async function saveInvoiceFile(file: File) {
  return uploadFileToStorage(file, 'invoices');
}

async function removeUploadedInvoice(invoiceUrl: string) {
  // Blob cleanup is intentionally skipped because uploads are immutable URLs
  // and rollback failures should not block the action response.
  void invoiceUrl;
}

function validationError(
  message: string,
  errors?: RegisterAssetActionState['errors']
): RegisterAssetActionState {
  return { success: false, message, errors };
}

function resolveDbErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const maybeError = error as {
    code?: string;
    cause?: { code?: string };
  };

  return maybeError.code ?? maybeError.cause?.code;
}

function isAssetTagUniqueViolation(error: unknown): boolean {
  const code = resolveDbErrorCode(error);

  if (code === '23505') {
    const message = String(error);
    return (
      message.includes('asset_tag') ||
      message.includes('assets_asset_tag_unique')
    );
  }

  return false;
}

// ---------------------------------------------------------------------------
// Unified Asset Registration (all pillars)
// ---------------------------------------------------------------------------

export async function registerAsset(
  _prevState: RegisterAssetActionState,
  formData: FormData
): Promise<RegisterAssetActionState> {
  const actionTimer = startLatencyTimer();
  let uploadedInvoiceUrl: string | null = null;

  try {
    // 1. Auth
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return validationError('Please sign in to register assets.', {
        form: ['Please sign in to register assets.'],
      });
    }

    if (!canManageAssets(currentUser.role)) {
      return validationError(
        'Forbidden: You do not have permission to register assets.',
        { form: ['Forbidden: You do not have permission to register assets.'] }
      );
    }

    // 2. Parse & validate
    const rawInput = {
      pillar: toFormValue(formData, 'pillar'),
      categoryId: toFormValue(formData, 'categoryId'),
      brandId: toFormValue(formData, 'brandId'),
      modelId: toFormValue(formData, 'modelId'),
      name: toFormValue(formData, 'name'),
      serialNumber: toFormValue(formData, 'serialNumber'),
      locationId: toFormValue(formData, 'locationId'),
      ownerId: toFormValue(formData, 'ownerId'),
      condition: toFormValue(formData, 'condition'),
      purchaseDate: toFormValue(formData, 'purchaseDate'),
      basePrice: toFormValue(formData, 'basePrice'),
      shippingCost: toFormValue(formData, 'shippingCost'),
      tax: toFormValue(formData, 'tax'),
      currencyCode: toFormValue(formData, 'currencyCode'),
      warrantyMonths: toFormValue(formData, 'warrantyMonths'),
      vendorId: toFormValue(formData, 'vendorId'),
      notes: toFormValue(formData, 'notes'),
    };

    // Parse instance attributes from form (dynamic fields from customSchema)
    const instanceAttributesRaw = toFormValue(formData, 'instanceAttributes');
    let parsedInstanceAttributes: Record<string, unknown> | undefined;

    if (instanceAttributesRaw) {
      try {
        parsedInstanceAttributes = JSON.parse(instanceAttributesRaw);
      } catch {
        return validationError(
          'Please correct the highlighted fields and try again.',
          { form: ['Invalid custom field data.'] }
        );
      }
    }

    const parsed = assetRegistrationSchema.safeParse({
      ...rawInput,
      instanceAttributes: parsedInstanceAttributes,
    });

    if (!parsed.success) {
      return validationError(
        'Please correct the highlighted fields and try again.',
        parsed.error.flatten().fieldErrors
      );
    }

    // 3. Invoice file
    const invoiceFile = toFormFile(formData, 'invoiceFile');
    const invoiceFileError = validateInvoiceFile(invoiceFile);

    if (invoiceFileError) {
      return validationError(
        'Please correct the highlighted fields and try again.',
        { invoiceFile: [invoiceFileError] }
      );
    }

    const input = parsed.data;

    // 4. Validate FK references in parallel
    const [
      categoryRecord,
      brandRecord,
      modelRecord,
      vendorRecord,
      ownerRecord,
      locationRecord,
      duplicateSerialRecord,
    ] = await Promise.all([
      db.query.categories.findFirst({
        where: eq(categories.id, input.categoryId),
        columns: { id: true, prefix: true, pillar: true, isActive: true },
      }),
      db.query.brands.findFirst({
        where: eq(brands.id, input.brandId),
        columns: { id: true, name: true, isActive: true },
      }),
      db.query.models.findFirst({
        where: eq(models.id, input.modelId),
        columns: {
          id: true,
          name: true,
          categoryId: true,
          brandId: true,
          isActive: true,
        },
      }),
      db.query.vendors.findFirst({
        where: eq(vendors.id, input.vendorId),
        columns: { id: true, isActive: true },
      }),
      input.ownerId
        ? db.query.owners.findFirst({
            where: eq(owners.id, input.ownerId),
            columns: { id: true, isActive: true },
          })
        : Promise.resolve(null),
      input.locationId
        ? db.query.locations.findFirst({
            where: eq(locations.id, input.locationId),
            columns: { id: true, isActive: true },
          })
        : Promise.resolve(null),
      input.serialNumber
        ? db.query.assets.findFirst({
            where: eq(assets.serialNumber, input.serialNumber),
            columns: { id: true, assetTag: true },
          })
        : Promise.resolve(null),
    ]);

    if (!categoryRecord || !categoryRecord.isActive) {
      return validationError('Please select an active category.', {
        categoryId: ['Please select an active category.'],
      });
    }

    if (categoryRecord.pillar !== input.pillar) {
      return validationError(
        'Category does not belong to the selected pillar.',
        { categoryId: ['Category does not belong to the selected pillar.'] }
      );
    }

    if (!brandRecord || !brandRecord.isActive) {
      return validationError('Please select an active brand.', {
        brandId: ['Please select an active brand.'],
      });
    }

    if (!modelRecord || !modelRecord.isActive) {
      return validationError('Please select an active model.', {
        modelId: ['Please select an active model.'],
      });
    }

    if (modelRecord.categoryId !== input.categoryId) {
      return validationError(
        'Model does not belong to the selected category.',
        { modelId: ['Model does not belong to the selected category.'] }
      );
    }

    if (modelRecord.brandId !== input.brandId) {
      return validationError('Model does not belong to the selected brand.', {
        modelId: ['Model does not belong to the selected brand.'],
      });
    }

    // Vendors can serve multiple pillars — no pillar restriction check.
    if (!vendorRecord || !vendorRecord.isActive) {
      return validationError('Please select an active vendor.', {
        vendorId: ['Please select an active vendor.'],
      });
    }

    if (input.ownerId && (!ownerRecord || !ownerRecord.isActive)) {
      return validationError('Please select an active owner.', {
        ownerId: ['Please select an active owner.'],
      });
    }

    if (input.locationId && (!locationRecord || !locationRecord.isActive)) {
      return validationError('Please select an active location.', {
        locationId: ['Please select an active location.'],
      });
    }

    if (duplicateSerialRecord) {
      return validationError('Serial number already exists.', {
        serialNumber: [
          `Serial number is already used by ${duplicateSerialRecord.assetTag}.`,
        ],
      });
    }

    // 5. Upload invoice (before transaction — file I/O shouldn't be in a DB tx)
    if (invoiceFile) {
      try {
        uploadedInvoiceUrl = await saveInvoiceFile(invoiceFile);
      } catch {
        return validationError(
          'Please correct the highlighted fields and try again.',
          {
            invoiceFile: [
              'Unable to upload invoice attachment. Please upload a supported document or image and try again.',
            ],
          }
        );
      }
    }

    // 6. Compute derived values
    const shippingCost = input.shippingCost ?? 0;
    const tax = input.tax ?? 0;
    const totalCost = input.basePrice + shippingCost + tax;
    const currencyCode = input.currencyCode ?? 'USD';
    const warrantyExpiry = input.warrantyMonths
      ? toDateString(addMonths(input.purchaseDate, input.warrantyMonths))
      : null;

    const normalizedCategoryPrefix = categoryRecord.prefix.trim().toUpperCase();
    const pillarPrefix = PILLAR_PREFIX_MAP[input.pillar];
    const assetTagPrefix = `${pillarPrefix}-${normalizedCategoryPrefix}`;

    // 7. Neon HTTP driver does not support db.transaction(), so use
    // sequential writes with a compensating rollback for partial failures.
    let insertedAsset: { id: string; assetTag: string } | null = null;
    let lastInsertError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const countResult = await db
        .select({ value: sql<number>`cast(count(*) as integer)` })
        .from(assets)
        .where(like(assets.assetTag, `${assetTagPrefix}-%`));

      const nextSequence = (countResult[0]?.value ?? 0) + 1;
      const generatedAssetTag = buildAssetTag(
        pillarPrefix,
        normalizedCategoryPrefix,
        nextSequence
      );

      try {
        const [newAsset] = await db
          .insert(assets)
          .values({
            assetTag: generatedAssetTag,
            serialNumber: input.serialNumber ?? null,
            name: input.name,
            modelId: input.modelId,
            locationId: input.locationId ?? null,
            ownerId: input.ownerId ?? null,
            condition: input.condition ?? null,
            instanceAttributes:
              input.instanceAttributes &&
              Object.keys(input.instanceAttributes).length > 0
                ? input.instanceAttributes
                : input.notes
                  ? { notes: input.notes }
                  : null,
          })
          .returning({ id: assets.id, assetTag: assets.assetTag });

        if (!newAsset) {
          throw new Error('Unable to create asset.');
        }

        insertedAsset = newAsset;
        break;
      } catch (error) {
        lastInsertError = error;

        if (!isAssetTagUniqueViolation(error) || attempt === 2) {
          throw error;
        }
      }
    }

    if (!insertedAsset) {
      throw lastInsertError ?? new Error('Unable to create asset.');
    }

    try {
      await db.insert(assetPurchases).values({
        assetId: insertedAsset.id,
        vendorId: input.vendorId,
        purchaseDate: toDateString(input.purchaseDate),
        basePrice: input.basePrice.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        tax: tax.toFixed(2),
        totalCost: totalCost.toFixed(2),
        currencyCode,
        warrantyExpiry,
        invoiceUrl: uploadedInvoiceUrl,
      });
    } catch (purchaseError) {
      try {
        await db.delete(assets).where(eq(assets.id, insertedAsset.id));
      } catch {
        // Best effort: preserve original purchase error for observability.
      }

      throw purchaseError;
    }

    await logAuditAction({
      entityType: 'Asset',
      entityId: insertedAsset.id,
      actionType: 'CREATE',
      performedById: currentUser.id,
      newData: {
        assetTag: insertedAsset.assetTag,
        modelId: input.modelId,
      },
    });

    revalidatePath('/assets');

    return {
      success: true,
      message: `Asset ${insertedAsset.assetTag} was registered successfully.`,
      assetId: insertedAsset.assetTag,
      errors: {},
    };
  } catch (error) {
    // Clean up uploaded invoice if the transaction failed
    if (uploadedInvoiceUrl) {
      await removeUploadedInvoice(uploadedInvoiceUrl);
    }

    logError({
      scope: 'ACTION',
      label: 'assets.registerAsset',
      error,
    });

    return {
      success: false,
      message: 'Unexpected error while registering asset.',
      errors: {
        form: ['Unexpected error while registering asset.'],
      },
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assets.registerAsset',
      startTime: actionTimer,
    });
  }
}

// ---------------------------------------------------------------------------
// Read Actions (thin wrappers with auth over repo)
// ---------------------------------------------------------------------------

export async function getAssetDetails(id: string) {
  return getAssetDetailsById(id);
}

/**
 * Fetch the history events for an asset (delegated to repository)
 * @param id The asset id
 * @returns History events
 */
export async function getAssetHistory(id: string) {
  return getAssetHistoryById(id);
}

/**
 * Fetch the maintenance records for an asset (delegated to repository)
 * @param id The asset id
 * @returns Maintenance events
 */
export async function getAssetMaintenance(id: string) {
  return getAssetMaintenanceById(id);
}

// ---------------------------------------------------------------------------
// Update Asset (secured server action)
// ---------------------------------------------------------------------------

export async function updateAsset(
  assetId: string,
  data: {
    status?:
      | 'Available'
      | 'Assigned'
      | 'In Repair'
      | 'Defective'
      | 'Lost'
      | 'Retired'
      | 'Disposed';
    condition?: 'New' | 'Excellent' | 'Fair' | 'Poor' | 'Damaged' | null;
    name?: string | null;
    locationId?: number | null;
    instanceAttributes?: Record<string, unknown> | null;
  }
) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    throw new Error('Unauthorized: Please sign in.');
  }

  if (!canManageAssets(currentUser.role)) {
    throw new Error('Forbidden: You do not have permission to update assets.');
  }

  const currentAsset = await db.query.assets.findFirst({
    where: eq(assets.id, assetId),
  });

  if (!currentAsset) {
    throw new Error('Asset not found');
  }

  const [updatedAsset] = await db
    .update(assets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(assets.id, assetId))
    .returning();

  if (updatedAsset) {
    await logAuditAction({
      entityType: 'Asset',
      entityId: assetId,
      actionType: 'UPDATE',
      performedById: currentUser.id,
      oldData: currentAsset as unknown as Record<string, unknown>,
      newData: updatedAsset as unknown as Record<string, unknown>,
    });
  }

  revalidatePath('/assets');

  return updatedAsset ?? null;
}

/**
 * Manually overrides the status of an asset.
 * This action is restricted to GlobalAdmins and requires a justification note.
 *
 * @param assetId The UUID of the asset
 * @param newStatus The target status (built-in or custom)
 * @param reasonNote Justification for the change (min 10 chars)
 */
export async function manualStatusOverrideAction(
  assetId: string,
  newStatus: string,
  reasonNote: string
): Promise<{ success: boolean; message: string }> {
  const actionTimer = startLatencyTimer();

  try {
    // 1. Auth Guard (Strictly GlobalAdmin)
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return { success: false, message: 'Unauthorized: Please sign in.' };
    }

    if (currentUser.role !== 'GlobalAdmin') {
      return {
        success: false,
        message: 'Forbidden: Only Global Admins can perform manual overrides.',
      };
    }

    // 2. Input Validation
    if (!isValidUuid(assetId)) {
      return { success: false, message: 'Invalid Asset ID.' };
    }

    const trimmedNote = reasonNote.trim();
    if (trimmedNote.length < 10) {
      return {
        success: false,
        message: 'Justification must be at least 10 characters long.',
      };
    }

    // Validate Status
    const isWorkflowGated = (WORKFLOW_GATED_STATUSES as readonly string[]).includes(newStatus);
    if (isWorkflowGated) {
      return {
        success: false,
        message: `Status "${newStatus}" cannot be set manually. Use the dedicated workflow.`,
      };
    }

    // Fetch permissible statuses (including custom ones) to validate target
    const manualOptions = await getManualOverrideStatuses();
    const isValidStatus = manualOptions.some((opt) => opt.value === newStatus);

    if (!isValidStatus) {
      return { success: false, message: `Invalid status: ${newStatus}` };
    }

    // 3. Fetch current asset
    const currentAsset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
    });

    if (!currentAsset) {
      return { success: false, message: 'Asset not found.' };
    }

    if (currentAsset.status === newStatus) {
      return { success: false, message: `Asset is already "${newStatus}".` };
    }

    // 4. Atomic Transaction
    await db.transaction(async (tx) => {
      // Step A: Update asset status
      await tx
        .update(assets)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({ status: newStatus as any, updatedAt: new Date() })
        .where(eq(assets.id, assetId));

      // Step B: Close active assignments if required
      if (STATUSES_REQUIRING_ASSIGNMENT_CLOSURE.has(newStatus)) {
        await tx
          .update(assetAssignments)
          .set({ returnedDate: new Date() })
          .where(
            and(
              eq(assetAssignments.assetId, assetId),
              isNull(assetAssignments.returnedDate)
            )
          );
      }

      // Step C: Audit log
      await logAuditActionTx(tx, {
        entityType: 'Asset',
        entityId: assetId,
        actionType: 'STATUS_CHANGE',
        performedById: currentUser.id,
        oldData: { status: currentAsset.status },
        newData: { status: newStatus, reason: trimmedNote },
      });
    });

    // 5. Revalidation
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/software');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');

    return {
      success: true,
      message: `Status successfully updated to ${newStatus}.`,
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'assets.manualStatusOverrideAction',
      error,
    });

    return {
      success: false,
      message: 'Unexpected error while updating status.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assets.manualStatusOverrideAction',
      startTime: actionTimer,
    });
  }
}
