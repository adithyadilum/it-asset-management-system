import { MasterDataCache } from './resolve-references';
import { z } from 'zod';
import {
  BulkImportPreviewResult,
  ImportErrorRow,
  ResolvedImportRow,
} from './types';

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateSchema = z.string().regex(isoDateRegex, 'Date must be in YYYY-MM-DD format');

/**
 * Normalizes common date string formats to YYYY-MM-DD.
 * Handles:
 *  - YYYY-MM-DD  (already ISO, pass through)
 *  - M/D/YYYY or MM/DD/YYYY  (US-style, as produced by Excel)
 *  - D-M-YYYY or DD-MM-YYYY  (dash-separated day-first)
 *  - D.M.YYYY or DD.MM.YYYY  (dot-separated)
 * Returns the normalized string, or the original string if no pattern matches
 * (so that downstream validation can still reject it with a clear message).
 */
function normalizeDateString(raw: string): string {
  const trimmed = raw.trim();

  // Already ISO
  if (isoDateRegex.test(trimmed)) return trimmed;

  // M/D/YYYY or MM/DD/YYYY (slash-separated — Excel's default display format)
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // D-M-YYYY or DD-MM-YYYY (dash-separated day-first)
  const dashDayFirst = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashDayFirst) {
    const [, d, m, y] = dashDayFirst;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // D.M.YYYY or DD.MM.YYYY (dot-separated)
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // No recognized format — return as-is for validation to reject
  return trimmed;
}

export function validateRows(
  rows: Record<string, string>[],
  cache: MasterDataCache,
  category: { requiresSerial: boolean; customSchema: unknown }
): BulkImportPreviewResult {
  const validRows: ResolvedImportRow[] = [];
  const errorRows: ImportErrorRow[] = [];

  const customSchema = category.customSchema as {
    assetTracking?: {
      fieldName: string;
      inputType: string;
      isRequired: boolean;
      options?: string[];
    }[];
  };
  const customFields = customSchema?.assetTracking || [];

  // For intra-batch duplicate detection (Stage 4)
  const batchSerials = new Map<string, number[]>(); // Serial -> array of row indices

  const normalize = (val: string | undefined | null) =>
    val ? val.trim().toLowerCase() : '';

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNumber = i + 2; // Assuming row 1 is header

    const brandNameRaw = rawRow['Brand Name'] || '';
    const modelNameRaw = rawRow['Model Name'] || '';

    let cleanModelNameForError = modelNameRaw.trim();
    const errBracketMatch = cleanModelNameForError.match(/^(.*)\s+\[.*\]$/);
    if (errBracketMatch) {
      cleanModelNameForError = errBracketMatch[1].trim();
    }
    
    const generatedAssetName = brandNameRaw.trim() && cleanModelNameForError ? `${brandNameRaw.trim()} - ${cleanModelNameForError}` : '';

    const serialNumber = rawRow['Serial Number'] || '';

    const fail = (
      stage: ImportErrorRow['errorStage'],
      field: string,
      message: string
    ) => {
      errorRows.push({
        rowNumber,
        assetName: generatedAssetName || null,
        serialNumber: serialNumber || null,
        errorStage: stage,
        errorField: field,
        errorMessage: message,
      });
    };

    // ---------------------------------------------------------------------------
    // STAGE 1: STRUCTURAL
    // ---------------------------------------------------------------------------
    if (category.requiresSerial && !serialNumber.trim()) {
      fail(
        'STRUCTURAL',
        'Serial Number',
        'Serial Number is required for this category.'
      );
      continue;
    }

    const purchaseDateRaw = rawRow['Purchase Date'];
    const basePriceRaw = rawRow['Base Price'];
    const vendorNameRaw = rawRow['Vendor Name'];

    if (!brandNameRaw?.trim()) {
      fail('STRUCTURAL', 'Brand Name', 'Brand Name is required.');
      continue;
    }
    if (!modelNameRaw?.trim()) {
      fail('STRUCTURAL', 'Model Name', 'Model Name is required.');
      continue;
    }
    if (!purchaseDateRaw?.trim()) {
      fail('STRUCTURAL', 'Purchase Date', 'Purchase Date is required.');
      continue;
    }
    if (!basePriceRaw?.trim()) {
      fail('STRUCTURAL', 'Base Price', 'Base Price is required.');
      continue;
    }
    if (!vendorNameRaw?.trim()) {
      fail('STRUCTURAL', 'Vendor Name', 'Vendor Name is required.');
      continue;
    }

    // ---------------------------------------------------------------------------
    // STAGE 2: TYPE COERCION
    // ---------------------------------------------------------------------------
    const basePrice = Number(basePriceRaw);
    if (isNaN(basePrice)) {
      fail('TYPE', 'Base Price', 'Base Price must be a number.');
      continue;
    }

    const taxRaw = rawRow['Tax'];
    const tax = taxRaw?.trim() ? Number(taxRaw) : 0;
    if (isNaN(tax)) {
      fail('TYPE', 'Tax', 'Tax must be a number.');
      continue;
    }

    const shippingRaw = rawRow['Shipping Cost'];
    const shippingCost = shippingRaw?.trim() ? Number(shippingRaw) : 0;
    if (isNaN(shippingCost)) {
      fail('TYPE', 'Shipping Cost', 'Shipping Cost must be a number.');
      continue;
    }

    const warrantyRaw = rawRow['Warranty Months'];
    const warrantyMonths = warrantyRaw?.trim() ? parseInt(warrantyRaw, 10) : null;
    if (warrantyRaw?.trim() && (isNaN(warrantyMonths!) || warrantyMonths! <= 0)) {
      fail('TYPE', 'Warranty Months', 'Warranty Months must be a positive integer.');
      continue;
    }

    const normalizedPurchaseDate = normalizeDateString(purchaseDateRaw || '');
    const purchaseDateResult = dateSchema.safeParse(normalizedPurchaseDate);
    if (!purchaseDateResult.success) {
      fail('TYPE', 'Purchase Date', purchaseDateResult.error.issues[0].message);
      continue;
    }
    const purchaseDateObj = new Date(purchaseDateResult.data);
    if (isNaN(purchaseDateObj.getTime())) {
      fail('TYPE', 'Purchase Date', 'Purchase Date must be a valid date.');
      continue;
    }

    const currencyCode = rawRow['Currency Code']?.trim()?.toUpperCase();
    if (currencyCode && !/^[A-Z]{3}$/.test(currencyCode)) {
      fail('TYPE', 'Currency Code', 'Currency Code must be a 3-letter string.');
      continue;
    }

    // ---------------------------------------------------------------------------
    // STAGE 3: REFERENTIAL INTEGRITY
    // ---------------------------------------------------------------------------
    const brandRef = cache.brands.get(normalize(brandNameRaw));
    if (!brandRef || !brandRef.isActive) {
      fail('REFERENTIAL', 'Brand Name', 'Brand Name is invalid or inactive.');
      continue;
    }

    // Handle "ModelName [BrandName]" format stripping
    let cleanModelName = modelNameRaw.trim();
    const bracketMatch = cleanModelName.match(/^(.*)\s+\[.*\]$/);
    if (bracketMatch) {
      cleanModelName = bracketMatch[1].trim();
    }

    const modelCacheKey = `${normalize(cleanModelName)}|${brandRef.id}`;
    const modelRef = cache.models.get(modelCacheKey);

    if (!modelRef || !modelRef.isActive) {
      fail(
        'REFERENTIAL',
        'Model Name',
        'Model Name is invalid, inactive, or belongs to a different category.'
      );
      continue;
    }

    const locationNameRaw = rawRow['Location Name'];
    let locationId: number | null = null;
    if (locationNameRaw?.trim()) {
      const locRef = cache.locations.get(normalize(locationNameRaw));
      if (!locRef || !locRef.isActive) {
        fail('REFERENTIAL', 'Location Name', 'Location Name is invalid or inactive.');
        continue;
      }
      locationId = locRef.id;
    }

    const ownerNameRaw = rawRow['Owner Name'];
    let ownerId: number | null = null;
    if (ownerNameRaw?.trim()) {
      const ownRef = cache.owners.get(normalize(ownerNameRaw));
      if (!ownRef || !ownRef.isActive) {
        fail('REFERENTIAL', 'Owner Name', 'Owner Name is invalid or inactive.');
        continue;
      }
      ownerId = ownRef.id;
    }

    const vendorRef = cache.vendors.get(normalize(vendorNameRaw));
    if (!vendorRef || !vendorRef.isActive) {
      fail('REFERENTIAL', 'Vendor Name', 'Vendor Name is invalid or inactive.');
      continue;
    }

    const conditionRaw = rawRow['Condition']?.trim();
    const validConditions = ['New', 'Excellent', 'Fair', 'Poor', 'Damaged'];
    let condition: string | null = null;
    if (conditionRaw) {
      const matchingCond = validConditions.find(
        (c) => c.toLowerCase() === conditionRaw.toLowerCase()
      );
      if (!matchingCond) {
        fail('REFERENTIAL', 'Condition', 'Condition is invalid.');
        continue;
      }
      condition = matchingCond;
    }

    // ---------------------------------------------------------------------------
    // STAGE 4: BUSINESS RULES
    // ---------------------------------------------------------------------------
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (purchaseDateObj > today) {
      fail('BUSINESS_RULE', 'Purchase Date', 'Purchase Date cannot be in the future.');
      continue;
    }

    if (serialNumber?.trim()) {
      const normalizedSerial = normalize(serialNumber);
      if (cache.serialNumbers.has(normalizedSerial)) {
        fail('BUSINESS_RULE', 'Serial Number', 'Serial Number already exists.');
        continue;
      }

      // Track for intra-batch duplicate detection
      if (!batchSerials.has(normalizedSerial)) {
        batchSerials.set(normalizedSerial, []);
      }
      batchSerials.get(normalizedSerial)!.push(i);
    }

    // ---------------------------------------------------------------------------
    // STAGE 5: EAV SCHEMA
    // ---------------------------------------------------------------------------
    const instanceAttributes: Record<string, unknown> = {};
    let eavFailed = false;

    for (const field of customFields) {
      const fieldVal = rawRow[field.fieldName]?.trim() || '';

      if (field.isRequired && !fieldVal) {
        fail('EAV_SCHEMA', field.fieldName, `${field.fieldName} is required.`);
        eavFailed = true;
        break; // fail fast
      }

      if (fieldVal) {
        if (field.inputType === 'Number') {
          const num = Number(fieldVal);
          if (isNaN(num)) {
            fail('EAV_SCHEMA', field.fieldName, `${field.fieldName} must be a number.`);
            eavFailed = true;
            break;
          }
          instanceAttributes[field.fieldName] = num;
        } else if (field.inputType === 'Boolean') {
          const lower = fieldVal.toLowerCase();
          if (lower !== 'yes' && lower !== 'no' && lower !== 'true' && lower !== 'false') {
            fail('EAV_SCHEMA', field.fieldName, `${field.fieldName} must be Yes or No.`);
            eavFailed = true;
            break;
          }
          instanceAttributes[field.fieldName] = lower === 'yes' || lower === 'true';
        } else if (field.inputType === 'Dropdown') {
          const allowedOptions = field.options?.map((o) => normalize(o)) || [];
          if (!allowedOptions.includes(normalize(fieldVal))) {
            fail('EAV_SCHEMA', field.fieldName, `${field.fieldName} value is invalid.`);
            eavFailed = true;
            break;
          }
          instanceAttributes[field.fieldName] = fieldVal;
        } else if (field.inputType === 'Date') {
          const normalizedVal = normalizeDateString(fieldVal);
          const dateResult = dateSchema.safeParse(normalizedVal);
          if (!dateResult.success) {
            fail('EAV_SCHEMA', field.fieldName, dateResult.error.issues[0].message);
            eavFailed = true;
            break;
          } else {
             const d = new Date(dateResult.data);
             if (isNaN(d.getTime())) {
                fail('EAV_SCHEMA', field.fieldName, `${field.fieldName} must be a valid date.`);
                eavFailed = true;
                break;
             }
             instanceAttributes[field.fieldName] = normalizedVal;
          }
        } else {
          // Text
          instanceAttributes[field.fieldName] = fieldVal;
        }
      }
    }

    if (eavFailed) continue;

    // ---------------------------------------------------------------------------
    // ROW PASSED INITIAL VALIDATION
    // ---------------------------------------------------------------------------
    validRows.push({
      rowNumber,
      name: generatedAssetName,
      serialNumber: serialNumber.trim() || null,
      modelId: modelRef.id,
      brandId: brandRef.id,
      locationId,
      ownerId,
      vendorId: vendorRef.id,
      condition,
      purchaseDate: purchaseDateObj.toISOString().split('T')[0],
      basePrice,
      tax,
      shippingCost,
      currencyCode: currencyCode || 'LKR',
      warrantyMonths,
      notes: rawRow['Notes']?.trim() || null,
      instanceAttributes: Object.keys(instanceAttributes).length > 0 ? instanceAttributes : null,
    });
  }

  // ---------------------------------------------------------------------------
  // INTRA-BATCH DUPLICATE DETECTION (Part of Stage 4)
  // Both duplicates must be rejected.
  // ---------------------------------------------------------------------------
  const finalValidRows: ResolvedImportRow[] = [];
  const invalidIndices = new Set<number>();

  for (const indices of batchSerials.values()) {
    if (indices.length > 1) {
      // Duplicates found! Fail all of them.
      for (const idx of indices) {
        invalidIndices.add(idx);
        const rowNumber = idx + 2;
        const rawRow = rows[idx];
        errorRows.push({
          rowNumber,
          assetName: null,
          serialNumber: rawRow['Serial Number'] || null,
          errorStage: 'BUSINESS_RULE',
          errorField: 'Serial Number',
          errorMessage: 'Serial Number is duplicated within this import batch.',
        });
      }
    }
  }

  // Filter out any valid rows that turned out to be intra-batch duplicates
  for (const vr of validRows) {
    if (!invalidIndices.has(vr.rowNumber - 2)) {
      finalValidRows.push(vr);
    }
  }

  return {
    success: finalValidRows.length > 0 && errorRows.length === 0,
    validRows: finalValidRows,
    errorRows,
  };
}
