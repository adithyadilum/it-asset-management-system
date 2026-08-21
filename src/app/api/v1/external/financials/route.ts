import { NextRequest, NextResponse } from 'next/server';
import { eq, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, assetPurchases, models, categories } from '@/db/schema';
import { withApiKey } from '@/lib/api/with-api-key';
import { apiError, parseBoundedInt } from '@/lib/api/utils';
import { calculateCurrentBookValue } from '@/lib/depreciation';

export const GET = withApiKey(
  'read:financials',
  async (request: NextRequest) => {
    try {
      const searchParams = request.nextUrl.searchParams;

      const limitResult = parseBoundedInt(
        searchParams.get('limit'),
        50,
        1,
        200
      );
      if (!limitResult.ok) {
        return apiError(
          400,
          'INVALID_PARAM',
          'limit must be an integer between 1 and 200'
        );
      }

      const offsetResult = parseBoundedInt(
        searchParams.get('offset'),
        0,
        0,
        Number.MAX_SAFE_INTEGER
      );
      if (!offsetResult.ok) {
        return apiError(
          400,
          'INVALID_PARAM',
          'offset must be a non-negative integer'
        );
      }

      // Build conditions: ignore already disposed assets
      const whereClause = ne(assets.status, 'Disposed');

      // Fetch total count
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
        .where(whereClause);
      const total = countRow?.count ?? 0;

      // Fetch financial ledger details
      const result = await db
        .select({
          id: assets.id,
          assetTag: assets.assetTag,
          name: assets.name,
          categoryName: categories.name,
          purchaseDate: assetPurchases.purchaseDate,
          basePrice: assetPurchases.basePrice,
          tax: assetPurchases.tax,
          shippingCost: assetPurchases.shippingCost,
          totalCost: assetPurchases.totalCost,
          currencyCode: assetPurchases.currencyCode,
          usefulLifeMonths: assets.usefulLifeMonths,
          salvageValue: assets.salvageValue,
        })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
        .where(whereClause)
        .orderBy(sql`${assetPurchases.purchaseDate} DESC`)
        .limit(limitResult.value)
        .offset(offsetResult.value);

      // Calculate current book value and accumulated depreciation using math helpers
      const data = result.map((row) => {
        const originalCost = parseFloat(row.totalCost?.toString() || '0');
        const salvage = parseFloat(row.salvageValue?.toString() || '0');
        const usefulLife = row.usefulLifeMonths ?? 60;

        const bookValue = calculateCurrentBookValue({
          cost: originalCost,
          salvageValue: salvage,
          usefulLifeMonths: usefulLife,
          purchaseDate: row.purchaseDate,
        });

        const roundedBookValue = Math.round(bookValue * 100) / 100;
        const accumulatedDepreciation =
          Math.round((originalCost - roundedBookValue) * 100) / 100;

        return {
          id: row.id,
          assetTag: row.assetTag,
          name: row.name,
          category: row.categoryName,
          purchaseDate: row.purchaseDate,
          financials: {
            basePrice: parseFloat(row.basePrice?.toString() || '0'),
            tax: parseFloat(row.tax?.toString() || '0'),
            shippingCost: parseFloat(row.shippingCost?.toString() || '0'),
            originalCost,
            currencyCode: row.currencyCode || 'LKR',
            usefulLifeMonths: usefulLife,
            salvageValue: parseFloat(row.salvageValue?.toString() || '0'),
            currentBookValue: roundedBookValue,
            accumulatedDepreciation,
          },
        };
      });

      return NextResponse.json(
        {
          success: true,
          data,
          pagination: {
            limit: limitResult.value,
            offset: offsetResult.value,
            total,
            returned: data.length,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('GET /api/v1/external/financials error:', error);
      return apiError(500, 'INTERNAL_ERROR', 'Internal server error');
    }
  }
);
