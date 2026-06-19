import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, assetPurchases, softwareLicenses, models } from '@/db/schema';
import { withApiKey } from '@/lib/api/with-api-key';
import {
  countAssetsForExternalApi,
  getAssetsForExternalApi,
} from '@/lib/data/external-api-repo';
import { assetRegistrationSchema, PILLAR_PREFIX_MAP } from '@/lib/validations/asset-registration';
import { logAuditAction } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';
import { convertCurrencyAmount } from '@/lib/currency';
import { fetchLiveExchangeRates } from '@/lib/currency-server';

function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
    },
    { status }
  );
}

function parseBoundedInt(value: string | null, defaultValue: number, min: number, max: number) {
  if (value === null || value.trim() === '') {
    return { ok: true as const, value: defaultValue };
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { ok: false as const };
  }

  return { ok: true as const, value: parsed };
}

function toDateString(date: Date) {
  return date.toISOString().split('T')[0];
}

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

// GET /api/v1/external/assets - scope: read:assets
export const GET = withApiKey('read:assets', async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    const limitResult = parseBoundedInt(searchParams.get('limit'), 50, 1, 200);
    if (!limitResult.ok) {
      return apiError(400, 'INVALID_PARAM', 'limit must be an integer between 1 and 200');
    }

    const offsetResult = parseBoundedInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
    if (!offsetResult.ok) {
      return apiError(400, 'INVALID_PARAM', 'offset must be a non-negative integer');
    }

    const status = searchParams.get('status')?.trim() || undefined;
    const pillar = searchParams.get('pillar')?.trim() || undefined;

    const filters = { status, pillar };
    const pagination = { limit: limitResult.value, offset: offsetResult.value };

    const [data, total] = await Promise.all([
      getAssetsForExternalApi(filters, pagination),
      countAssetsForExternalApi(filters),
    ]);

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          limit: pagination.limit,
          offset: pagination.offset,
          total,
          returned: data.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/v1/external/assets error:', error);
    return apiError(500, 'INTERNAL_ERROR', 'Internal server error');
  }
});

// POST /api/v1/external/assets - scope: write:assets
export const POST = withApiKey('write:assets', async (request: NextRequest, { apiKey }) => {
  try {
    const bodyText = await request.text();
    let bodyJson;
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      return apiError(400, 'INVALID_JSON', 'Invalid JSON body');
    }

    // 1. Validate inputs with Zod
    const parsed = assetRegistrationSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return apiError(400, 'VALIDATION_FAILED', 'Input validation failed', parsed.error.format());
    }

    const input = parsed.data;

    // 2. Fetch the selected model to verify existence and get prefix
    const modelWithCategory = await db.query.models.findFirst({
      where: eq(models.id, input.modelId),
      with: { category: true },
    });

    if (!modelWithCategory) {
      return apiError(400, 'MODEL_NOT_FOUND', 'The selected modelId does not exist.');
    }

    const categoryPrefix = PILLAR_PREFIX_MAP[input.pillar];
    const resolvedCategoryPrefix =
      modelWithCategory.category.prefix.trim().toUpperCase() || categoryPrefix;

    // 3. Resolve currency conversion rate
    const apiRates = (await fetchLiveExchangeRates()) ?? undefined;
    const conversionRate = convertCurrencyAmount(
      1,
      input.currencyCode || 'LKR',
      'LKR',
      apiRates
    ).toFixed(6);

    const usefulLifeMonths = 60; // Default useful life of 5 years

    // 4. Database Transaction
    const insertedAsset = await db.transaction(async (tx) => {
      let insertedAsset = null;
      let lastInsertError = null;

      // Retry sequence-based tag generation up to 2 times for race conditions
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
              usefulLifeMonths,
              instanceAttributes: input.instanceAttributes,
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

      // Insert Purchase record
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
      });

      // If Software category, insert software licenses
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

    // 5. Audit Logging and Webhook Dispatch
    await logAuditAction({
      entityType: 'Asset',
      entityId: insertedAsset.id,
      actionType: 'CREATE',
      performedById: apiKey.createdById, // Audit logs track user who created the API key
      newData: {
        assetTag: insertedAsset.assetTag,
        modelId: input.modelId,
        ...(input.pillar === 'Software' && input.licenseType
          ? {
              licenseType: input.licenseType,
              totalSeats: input.totalSeats ?? 1,
            }
          : {}),
        source: 'API',
      },
    });

    void dispatchWebhookEvent('asset.created', {
      assetTag: insertedAsset.assetTag,
      assetId: insertedAsset.id,
      modelId: input.modelId,
      pillar: input.pillar,
      source: 'API',
    });

    return NextResponse.json(
      {
        success: true,
        message: `Asset ${insertedAsset.assetTag} was registered successfully.`,
        data: {
          id: insertedAsset.id,
          assetTag: insertedAsset.assetTag,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/v1/external/assets error:', error);
    return apiError(500, 'INTERNAL_ERROR', 'Internal server error');
  }
});
