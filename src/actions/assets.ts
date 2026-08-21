'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import {
  assetAssignments,
  assetPurchases,
  assets,
  models,
  softwareLicenses,
} from '@/db/schema';
import { logAuditAction, logAuditActionTx } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';
import { canManageAssets, canViewAssetRegistry } from '@/lib/auth/roles';
import {
  getAssetDetailsById,
  getAssetHistoryById,
  getAssetMaintenanceById,
} from '@/lib/data/asset-details-repo';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { getManualOverrideStatuses } from '@/actions/statuses';
import { WORKFLOW_GATED_STATUSES } from '@/lib/constants';
import {
  assetRegistrationSchema,
  updateAssetSchema,
  manualStatusOverrideSchema,
  PILLAR_PREFIX_MAP,
} from '@/lib/validations/asset-registration';
import {
  editAssetSchema,
  type EditAssetActionState,
} from '@/lib/validations/asset-edit';
import { convertCurrencyAmount } from '@/lib/currency';
import { fetchLiveExchangeRates } from '@/lib/currency-server';
import { DEFAULT_USEFUL_LIFE_MONTHS } from '@/lib/depreciation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export type RegisterAssetActionState = {
  success: boolean;
  message?: string;
  assetId?: string;
  errors?: {
    form?: string[];
    [key: string]: string[] | undefined;
  };
};

function validationError(
  message: string,
  errors: RegisterAssetActionState['errors'] = {}
): RegisterAssetActionState {
  return {
    success: false,
    message,
    errors,
  };
}

function toDateString(date: Date) {
  return date.toISOString().split('T')[0];
}

async function removeUploadedInvoice(url: string) {
  try {
    // Note: Implementing proper blob deletion would happen here if we used Vercel Blob
    console.warn(`[assets.cleanup] Fake-removing blob at ${url}`);
  } catch (error) {
    console.error(`[assets.cleanup] Failed to delete blob ${url}`, error);
  }
}

/**
 * Checks if a Drizzle/Postgres error is a unique constraint violation on asset_tag
 */
function isAssetTagUniqueViolation(error: unknown): boolean {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  ) {
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
        {
          form: ['Forbidden: You do not have permission to register assets.'],
        }
      );
    }

    // 2. Parse and validate all fields with Zod
    const rawInput = {
      pillar: formData.get('pillar'),
      name: formData.get('name'),
      categoryId: formData.get('categoryId'),
      brandId: formData.get('brandId'),
      modelId: formData.get('modelId'),
      serialNumber: formData.get('serialNumber'),
      locationId: formData.get('locationId') || undefined,
      ownerId: formData.get('ownerId') || undefined,
      condition: formData.get('condition') || undefined,
      vendorId: formData.get('vendorId'),
      purchaseDate: formData.get('purchaseDate'),
      basePrice: formData.get('basePrice'),
      tax: formData.get('tax') || undefined,
      shippingCost: formData.get('shippingCost') || undefined,
      currencyCode: formData.get('currencyCode') || undefined,
      warrantyMonths: formData.get('warrantyMonths') || undefined,
      notes: formData.get('notes') || undefined,
      instanceAttributes: (() => {
        try {
          return JSON.parse(String(formData.get('instanceAttributes') || '{}'));
        } catch {
          return {};
        }
      })(),
      licenseType: formData.get('licenseType') || undefined,
      billingCycle: formData.get('billingCycle') || undefined,
      totalSeats: formData.get('totalSeats') || undefined,
      licenseStartDate: formData.get('licenseStartDate') || undefined,
      licenseExpiryDate: formData.get('licenseExpiryDate') || undefined,
    };

    const parsed = assetRegistrationSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ?? 'Validation failed.';
      return validationError(firstError, parsed.error.flatten().fieldErrors);
    }

    const input = {
      ...parsed.data,
      pillar: parsed.data.pillar,
      // Comes from the validated Expected Lifespan field now. It used to be
      // read straight off formData, outside the schema, with a hardcoded 60 --
      // and since no form input ever set it, every asset silently got 5 years
      // whether or not that was right for it.
      usefulLifeMonths: parsed.data.expectedLifespanYears
        ? parsed.data.expectedLifespanYears * 12
        : DEFAULT_USEFUL_LIFE_MONTHS,
      invoiceFile: formData.get('invoiceFile') as File | null,
    };
    const instanceAttributes = {
      ...(input.instanceAttributes ?? {}),
      ...(input.pillar === 'Software' &&
      input.licenseType === 'Subscription' &&
      input.billingCycle
        ? { billing_cycle: input.billingCycle }
        : {}),
    };

    // 3. File Upload (Placeholder)
    if (input.invoiceFile && input.invoiceFile.size > 0) {
      // In a real app: uploadedInvoiceUrl = await vercelBlob.put(...)
      uploadedInvoiceUrl = `https://placeholder-storage.com/invoices/${Date.now()}-${input.invoiceFile.name}`;
    }

    // 4. Build unique Asset Tag
    // Derive the pillar prefix from the validated pillar value
    const categoryPrefix = PILLAR_PREFIX_MAP[input.pillar];

    // 5. Look up the model to get the category-specific prefix (overrides pillar prefix)
    const modelWithCategory = await db.query.models.findFirst({
      where: eq(models.id, input.modelId),
      with: { category: true },
    });

    if (!modelWithCategory) {
      return validationError('The selected model does not exist.');
    }

    const resolvedCategoryPrefix =
      modelWithCategory.category.prefix.trim().toUpperCase() || categoryPrefix;

    const apiRates = (await fetchLiveExchangeRates()) ?? undefined;
    const conversionRate = convertCurrencyAmount(
      1,
      input.currencyCode || 'LKR',
      'LKR',
      apiRates
    ).toFixed(6);

    // 6. Database Transaction
    const insertedAsset = await db.transaction(async (tx) => {
      let insertedAsset = null;
      let lastInsertError = null;

      // Retry loop for potential race conditions on sequence-based tag generation
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const countResult = await tx
            .select({ value: sql<number>`cast(count(*) as integer)` })
            .from(assets)
            .where(
              sql`${assets.assetTag} LIKE ${resolvedCategoryPrefix + '-%'}`
            );

          const nextSequence = (countResult[0]?.value ?? 0) + 1;
          const assetTag = `${resolvedCategoryPrefix}-${String(nextSequence).padStart(3, '0')}`;

          const [newAsset] = await tx
            .insert(assets)
            .values({
              assetTag,
              name: input.name,
              modelId: input.modelId,
              serialNumber: input.serialNumber,
              locationId: input.locationId,
              ownerId: input.ownerId,
              status: 'Available',
              condition: input.condition,
              usefulLifeMonths: input.usefulLifeMonths,
              instanceAttributes,
            })
            .returning({ id: assets.id, assetTag: assets.assetTag });

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

      const shippingCost = input.shippingCost ?? 0;
      const tax = input.tax ?? 0;
      const basePrice = input.basePrice;
      const totalCost = basePrice + tax + shippingCost;

      const purchaseDate = input.purchaseDate;
      const warrantyExpiry = input.warrantyMonths
        ? new Date(
            purchaseDate.getFullYear(),
            purchaseDate.getMonth() + input.warrantyMonths,
            purchaseDate.getDate()
          )
        : null;

      await tx.insert(assetPurchases).values({
        assetId: insertedAsset.id,
        vendorId: input.vendorId,
        purchaseDate: toDateString(purchaseDate),
        basePrice: basePrice.toFixed(2),
        tax: tax.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        totalCost: totalCost.toFixed(2),
        currencyCode: input.currencyCode,
        exchangeRate: conversionRate,
        warrantyExpiry: warrantyExpiry ? toDateString(warrantyExpiry) : null,
        invoiceUrl: uploadedInvoiceUrl,
      });

      if (input.pillar === 'Software') {
        await tx.insert(softwareLicenses).values({
          modelId: input.modelId,
          assetId: insertedAsset.id,
          licenseKey: input.serialNumber || null,
          licenseType: input.licenseType || 'Subscription',
          totalSeats: input.totalSeats ?? 1,
          startDate: input.licenseStartDate
            ? toDateString(input.licenseStartDate)
            : null,
          expiryDate: input.licenseExpiryDate
            ? toDateString(input.licenseExpiryDate)
            : null,
        });
      }

      return insertedAsset;
    });

    // 7. Success logic
    await logAuditAction({
      entityType: 'Asset',
      entityId: insertedAsset.id,
      actionType: 'CREATE',
      performedById: currentUser.id,
      newData: {
        assetTag: insertedAsset.assetTag,
        modelId: input.modelId,
        ...(input.pillar === 'Software' && input.licenseType
          ? {
              licenseType: input.licenseType,
              billingCycle:
                input.licenseType === 'Subscription'
                  ? input.billingCycle
                  : undefined,
              totalSeats: input.totalSeats ?? 1,
            }
          : {}),
      },
    });

    void dispatchWebhookEvent('asset.created', {
      assetTag: insertedAsset.assetTag,
      assetId: insertedAsset.id,
      modelId: input.modelId,
      pillar: input.pillar,
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
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || !canViewAssetRegistry(currentUser.role))
    throw new Error('Unauthorized');

  return getAssetDetailsById(id);
}

/**
 * Fetch the history events for an asset (delegated to repository)
 * @param id The asset id
 * @returns History events
 */
export async function getAssetHistory(id: string) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || !canViewAssetRegistry(currentUser.role))
    throw new Error('Unauthorized');

  return getAssetHistoryById(id);
}

/**
 * Fetch the maintenance records for an asset (delegated to repository)
 * @param id The asset id
 * @returns Maintenance events
 */
export async function getAssetMaintenance(id: string) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || !canViewAssetRegistry(currentUser.role))
    throw new Error('Unauthorized');

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

  try {
    // Validate input with Zod
    const parsed = updateAssetSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input.');
    }

    const currentAsset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
    });

    if (!currentAsset) {
      throw new Error('Asset not found');
    }

    if (currentAsset.status === 'Disposed' || currentAsset.isArchived) {
      throw new Error('Disposed assets cannot be edited.');
    }

    const [updatedAsset] = await db
      .update(assets)
      .set({ ...parsed.data, updatedAt: new Date() })
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

      if (data.status && data.status !== currentAsset.status) {
        void dispatchWebhookEvent('asset.status_changed', {
          assetId,
          assetTag: currentAsset.assetTag,
          oldStatus: currentAsset.status,
          newStatus: data.status,
        });
      }
    }

    revalidatePath('/assets');

    return updatedAsset ?? null;
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'assets.updateAsset',
      error,
    });
    if (
      error instanceof Error &&
      (error.message === 'Asset not found' ||
        error.message === 'Disposed assets cannot be edited.')
    ) {
      throw error;
    }
    throw new Error('Failed to update asset.');
  }
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

    // 2. Input Validation via Zod
    const parsed = manualStatusOverrideSchema.safeParse({
      assetId,
      newStatus,
      reasonNote,
    });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Validation failed.',
      };
    }
    const trimmedNote = parsed.data.reasonNote;

    // Validate status is not workflow-gated
    const isWorkflowGated = (
      WORKFLOW_GATED_STATUSES as readonly string[]
    ).includes(newStatus);
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
      with: {
        model: {
          with: {
            category: true,
          },
        },
      },
    });

    if (!currentAsset) {
      return { success: false, message: 'Asset not found.' };
    }

    if (
      currentAsset.status === 'Disposed' ||
      currentAsset.status === 'Pending Disposal' ||
      currentAsset.isArchived
    ) {
      return {
        success: false,
        message: `Assets in "${currentAsset.status}" status or archived assets cannot have their status changed manually.`,
      };
    }

    if (currentAsset.model.category.pillar === 'Software') {
      return {
        success: false,
        message:
          'Software asset status is automatically managed and cannot be changed manually.',
      };
    }

    if (currentAsset.status === newStatus) {
      return { success: false, message: `Asset is already "${newStatus}".` };
    }

    // 4. Atomic Transaction
    await db.transaction(async (tx) => {
      // Step A: Update asset status
      await tx
        .update(assets)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(assets.id, assetId));

      // Step B: Close active assignments
      // Manual overrides always imply that the current assignment state is being bypassed/ended
      await tx
        .update(assetAssignments)
        .set({ returnedDate: new Date() })
        .where(
          and(
            eq(assetAssignments.assetId, assetId),
            isNull(assetAssignments.returnedDate)
          )
        );

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

    void dispatchWebhookEvent('asset.status_changed', {
      assetId,
      assetTag: currentAsset.assetTag,
      oldStatus: currentAsset.status,
      newStatus,
      trigger: 'manual_override',
    });

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

// ---------------------------------------------------------------------------
// Edit Asset Details (inline panel edit)
// ---------------------------------------------------------------------------

export async function editAssetDetailsAction(
  assetId: string,
  data: Record<string, unknown>
): Promise<EditAssetActionState> {
  const actionTimer = startLatencyTimer();

  try {
    // 1. Auth Guard
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return { success: false, message: 'Unauthorized: Please sign in.' };
    }

    if (!canManageAssets(currentUser.role)) {
      return {
        success: false,
        message: 'Forbidden: You do not have permission to edit assets.',
      };
    }

    // 2. Input Validation
    const parsed = editAssetSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Validation failed.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const { warrantyExpiry, ...assetFields } = parsed.data;

    // 3. Fetch current asset to verify state
    const currentAsset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
    });

    if (!currentAsset) {
      return { success: false, message: 'Asset not found.' };
    }

    if (currentAsset.status === 'Disposed' || currentAsset.isArchived) {
      return {
        success: false,
        message: 'Disposed assets cannot be edited.',
      };
    }

    // 4. Build update payload (only include fields that were actually provided)
    const assetUpdatePayload: Record<string, unknown> = {};
    if (assetFields.name !== undefined)
      assetUpdatePayload.name = assetFields.name;
    if (assetFields.condition !== undefined)
      assetUpdatePayload.condition = assetFields.condition;
    if (assetFields.locationId !== undefined)
      assetUpdatePayload.locationId = assetFields.locationId;
    if (assetFields.ownerId !== undefined)
      assetUpdatePayload.ownerId = assetFields.ownerId;
    if (assetFields.expectedLifespanYears !== undefined) {
      // Stored in months; null clears it and falls back to the default when
      // depreciation is computed.
      assetUpdatePayload.usefulLifeMonths =
        assetFields.expectedLifespanYears === null
          ? null
          : assetFields.expectedLifespanYears * 12;
    }
    if (assetFields.instanceAttributes !== undefined) {
      // Only allow keys that already exist on the asset's instance attributes
      const existingKeys = new Set(
        Object.keys(
          (currentAsset.instanceAttributes as Record<string, unknown> | null) ??
            {}
        )
      );
      const incomingKeys = Object.keys(assetFields.instanceAttributes ?? {});
      const unknownKeys = incomingKeys.filter((k) => !existingKeys.has(k));

      if (unknownKeys.length > 0) {
        return {
          success: false,
          message: `Unknown instance attribute keys: ${unknownKeys.join(', ')}`,
          errors: {
            instanceAttributes: [
              `Unknown keys are not allowed: ${unknownKeys.join(', ')}`,
            ],
          },
        };
      }

      assetUpdatePayload.instanceAttributes = assetFields.instanceAttributes;
    }

    const hasAssetChanges = Object.keys(assetUpdatePayload).length > 0;
    const hasWarrantyChange = warrantyExpiry !== undefined;

    if (!hasAssetChanges && !hasWarrantyChange) {
      return { success: true, message: 'No changes detected.' };
    }

    // 5. Atomic Transaction
    await db.transaction(async (tx) => {
      // Step A: Update assets table
      if (hasAssetChanges) {
        const result = await tx
          .update(assets)
          .set({ ...assetUpdatePayload, updatedAt: new Date() })
          .where(eq(assets.id, assetId))
          .returning({ id: assets.id });

        if (result.length === 0) {
          throw new Error(
            'Failed to update asset. Row not found or not updated.'
          );
        }
      }

      // Step B: Update warranty expiry in asset_purchases if provided
      if (hasWarrantyChange) {
        const result = await tx
          .update(assetPurchases)
          .set({ warrantyExpiry: warrantyExpiry, updatedAt: new Date() })
          .where(eq(assetPurchases.assetId, assetId))
          .returning({ id: assetPurchases.id });

        if (result.length === 0) {
          // If no purchase record exists, insert a new one
          const inserted = await tx
            .insert(assetPurchases)
            .values({
              assetId,
              warrantyExpiry,
              updatedAt: new Date(),
            })
            .returning({ id: assetPurchases.id });

          if (inserted.length === 0) {
            throw new Error('Failed to create asset purchase record.');
          }
        }
      }

      // Step C: Audit log
      await logAuditActionTx(tx, {
        entityType: 'Asset',
        entityId: assetId,
        actionType: 'UPDATE',
        performedById: currentUser.id,
        oldData: {
          name: currentAsset.name,
          condition: currentAsset.condition,
          locationId: currentAsset.locationId,
          ownerId: currentAsset.ownerId,
          instanceAttributes: currentAsset.instanceAttributes,
        } as Record<string, unknown>,
        newData: {
          ...assetUpdatePayload,
          ...(hasWarrantyChange ? { warrantyExpiry } : {}),
        } as Record<string, unknown>,
      });
    });

    // 6. Revalidation
    revalidatePath('/assets');
    revalidatePath('/assets/hardware');
    revalidatePath('/assets/software');
    revalidatePath('/assets/furniture');
    revalidatePath('/assets/office-electronics');

    return {
      success: true,
      message: 'Asset details updated successfully.',
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'assets.editAssetDetailsAction',
      error,
    });

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unexpected error while updating asset details.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assets.editAssetDetailsAction',
      startTime: actionTimer,
    });
  }
}
