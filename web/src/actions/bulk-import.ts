'use server';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { canManageAssets } from '@/lib/auth/roles';
import { generateTemplateWorkbook } from '@/lib/bulk-import/generate-template';
import { parseFile } from '@/lib/bulk-import/parse-file';
import { preloadMasterDataCache } from '@/lib/bulk-import/resolve-references';
import { BulkImportPreviewResult } from '@/lib/bulk-import/types';
import { validateRows } from '@/lib/bulk-import/validate-rows';
import { eq } from 'drizzle-orm';

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
      message:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while generating the template.',
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
      message:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while processing the file.',
    };
  }
}

