'use server';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import { assetPurchases, assets, categories } from '@/db/schema';
import { logAuditActionTx } from '@/lib/audit';
import { canManageAssets } from '@/lib/auth/roles';
import { generateTemplateWorkbook } from '@/lib/bulk-import/generate-template';
import { parseFile } from '@/lib/bulk-import/parse-file';
import { preloadMasterDataCache } from '@/lib/bulk-import/resolve-references';
import {
  BulkImportExecutionResult,
  BulkImportPreviewResult,
  ResolvedImportRow,
} from '@/lib/bulk-import/types';
import { validateRows } from '@/lib/bulk-import/validate-rows';
import { eq, like, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';
import { convertCurrencyAmount } from '@/lib/currency';
import { fetchLiveExchangeRates } from '@/lib/currency-server';

function addMonths(value: Date, months: number) {
  const nextDate = new Date(value);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function formatSequence(value: number) {
  return String(value).padStart(3, '0');
}

function buildAssetTag(categoryPrefix: string, sequence: number) {
  return `${categoryPrefix}-${formatSequence(sequence)}`;
}

function toDateString(date: Date) {
  return date.toISOString().split('T')[0];
}

export async function generateImportTemplate(categoryId: number) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return {
      success: false,
      message: 'Please sign in to generate import template.',
    };
  }

  if (!canManageAssets(currentUser.role)) {
    return {
      success: false,
      message: 'Forbidden: You do not have permission to register assets.',
    };
  }

  try {
    const { buffer, fileName } = await generateTemplateWorkbook(categoryId);

    // Convert Buffer to Base64 to safely pass it across the Server-Client boundary
    const fileBase64 = buffer.toString('base64');

    return {
      success: true,
      fileBase64,
      fileName,
    };
  } catch (error) {
    console.error('[generateImportTemplate] Error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while generating the template.',
    };
  }
}

export async function parseAndValidateImport(
  formData: FormData
): Promise<BulkImportPreviewResult> {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return {
      success: false,
      message: 'Please sign in to perform this action.',
    };
  }

  if (!canManageAssets(currentUser.role)) {
    return {
      success: false,
      message: 'Forbidden: You do not have permission to register assets.',
    };
  }

  const categoryIdStr = formData.get('categoryId') as string;
  const file = formData.get('file') as File;

  if (!categoryIdStr || !file) {
    return {
      success: false,
      message: 'Category ID and File are required.',
    };
  }

  const categoryId = parseInt(categoryIdStr, 10);
  if (isNaN(categoryId)) {
    return { success: false, message: 'Invalid Category ID.' };
  }

  try {
    // 1. Fetch category
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });

    if (!category || !category.isActive) {
      return { success: false, message: 'Category not found or is inactive.' };
    }

    // 2. Parse file
    const { rows, skippedEmptyRows } = await parseFile(file);

    // 3. Load cache
    const cache = await preloadMasterDataCache(categoryId);

    // 4. Validate rows
    const validationResult = validateRows(rows, cache, {
      requiresSerial: category.requiresSerial,
      customSchema: category.customSchema,
    });

    const totalRows = rows.length;
    const validCount = validationResult.validRows?.length || 0;
    const errorCount = validationResult.errorRows?.length || 0;

    return {
      success: validCount > 0 && errorCount === 0,
      summary: {
        totalRows,
        validCount,
        errorCount,
        skippedEmptyRows,
      },
      validRows: validationResult.validRows,
      errorRows: validationResult.errorRows,
    };
  } catch (error) {
    console.error('[parseAndValidateImport] Error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while processing the file.',
    };
  }
}

export async function executeBulkImport(
  categoryId: number,
  resolvedRows: ResolvedImportRow[],
  sourceFileName: string
): Promise<BulkImportExecutionResult> {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return {
      success: false,
      message: 'Please sign in to perform this action.',
    };
  }

  if (!canManageAssets(currentUser.role)) {
    return {
      success: false,
      message: 'Forbidden: You do not have permission to register assets.',
    };
  }

  if (!resolvedRows || resolvedRows.length === 0) {
    return { success: false, message: 'No rows to import.' };
  }

  if (resolvedRows.length > 5000) {
    return {
      success: false,
      message: 'Cannot import more than 5000 rows at once.',
    };
  }

  const BULK_IMPORT_LOCK_ID = 7777;
  const lockResult = await db.execute(
    sql`SELECT pg_try_advisory_lock(${BULK_IMPORT_LOCK_ID})`
  );
  const rows = Array.isArray(lockResult) ? lockResult : (lockResult as { rows?: unknown[] }).rows;
  const lockGranted = (rows?.[0] as Record<string, unknown> | undefined)?.pg_try_advisory_lock;

  if (!lockGranted) {
    return {
      success: false,
      message:
        'A bulk import is currently in progress. Please wait for it to complete.',
    };
  }

  try {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });

    if (!category || !category.isActive) {
      return { success: false, message: 'Category not found or is inactive.' };
    }

    const categoryPrefix = category.prefix.trim().toUpperCase();
    const assetTagPrefix = categoryPrefix;

    const countResult = await db
      .select({ value: sql<number>`cast(count(*) as integer)` })
      .from(assets)
      .where(like(assets.assetTag, `${assetTagPrefix}-%`));

    let nextSequence = (countResult[0]?.value ?? 0) + 1;

    let successCount = 0;
    let failedCount = 0;
    const importedAssetTags: string[] = [];
    const failedRows: Record<string, string | number>[] = [];

    const apiRates = await fetchLiveExchangeRates() ?? undefined;

    for (const row of resolvedRows) {
      let assetTag = '';

      try {
        await db.transaction(async (tx) => {
          assetTag = buildAssetTag(categoryPrefix, nextSequence);

          // 1. Insert asset
          const [newAsset] = await tx
            .insert(assets)
            .values({
              assetTag,
              serialNumber: row.serialNumber,
              name: row.name,
              modelId: row.modelId,
              locationId: row.locationId,
              ownerId: row.ownerId,
              condition: row.condition as
                | 'New'
                | 'Excellent'
                | 'Fair'
                | 'Poor'
                | 'Damaged'
                | null,
              status: 'Available',
              instanceAttributes: row.instanceAttributes,
            })
            .returning({ id: assets.id, assetTag: assets.assetTag });

          // 2. Insert purchase record
          const totalCost = row.basePrice + row.tax + row.shippingCost;
          const warrantyExpiry = row.warrantyMonths
            ? toDateString(
                addMonths(new Date(row.purchaseDate), row.warrantyMonths)
              )
            : null;

          const conversionRate = convertCurrencyAmount(1, row.currencyCode || 'LKR', 'LKR', apiRates).toFixed(6);

          await tx.insert(assetPurchases).values({
            assetId: newAsset.id,
            vendorId: row.vendorId,
            purchaseDate: row.purchaseDate,
            basePrice: row.basePrice.toFixed(2),
            tax: row.tax.toFixed(2),
            shippingCost: row.shippingCost.toFixed(2),
            totalCost: totalCost.toFixed(2),
            currencyCode: row.currencyCode,
            exchangeRate: conversionRate,
            warrantyExpiry,
          });

          // 3. Audit log
          await logAuditActionTx(tx, {
            entityType: 'Asset',
            entityId: newAsset.id,
            actionType: 'IMPORT',
            performedById: currentUser.id,
            newData: {
              assetTag: newAsset.assetTag,
              modelId: row.modelId,
              sourceFile: sourceFileName,
              sourceRow: row.rowNumber,
            },
          });
        });

        successCount++;
        importedAssetTags.push(assetTag);
        nextSequence++;
      } catch (_error) {
        console.error('Row import failed:', _error);
        failedCount++;
        failedRows.push({
          'Row Number': row.rowNumber,
          'Asset Name': row.name,
          'Serial Number': row.serialNumber || '',
          'Error Message':
            'Failed to import row — check the data and try again.',
        });
      }
    }

    let errorCsvData: string | undefined;
    if (failedRows.length > 0) {
      errorCsvData = Papa.unparse(failedRows);
    }

    revalidatePath('/assets', 'layout');

    return {
      success: true,
      summary: {
        successCount,
        failedCount,
        importedAssetTags,
      },
      errorCsvData,
    };
  } catch (error) {
    console.error('[executeBulkImport] Error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred during import execution.',
    };
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${BULK_IMPORT_LOCK_ID})`);
  }
}
