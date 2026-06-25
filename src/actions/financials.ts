// web/src/actions/financials.ts
'use server';

import { db } from '@/db';
import {
  assets,
  assetPurchases,
  models,
  categories,
  maintenanceTickets,
  assetDisposals,
} from '@/db/schema';
import { eq, sql, desc, and, ne, ilike, or, count } from 'drizzle-orm';
import { unstable_rethrow } from 'next/navigation';
import {  enforceActionAccess } from '@/actions/auth';
import { calculateCurrentBookValue } from '@/lib/depreciation';
import {
  depreciationLedgerParamsSchema,
  tcoLedgerParamsSchema,
  writeOffsLedgerParamsSchema,
} from '@/lib/validations/financials';

/**
 * Reusable RBAC guard for all financial endpoints
 */
async function enforceFinanceAccess() {
  const user = await enforceActionAccess();

  if (user.role !== 'GlobalAdmin' && user.role !== 'FinancialAuditor') {
    throw new Error('Forbidden');
  }
  return user;
}



// --- Pagination Interface ---
export interface LedgerPaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}

/**
 * US-22.2: The Depreciation Ledger
 * Calculates straight-line depreciation for all active assets.
 */
export async function getDepreciationLedger(
  params: LedgerPaginationParams & { ageFilter?: string } = {}
) {
  try {
    await enforceFinanceAccess();

    const resultParse = depreciationLedgerParamsSchema.safeParse(params);
    if (!resultParse.success) {
      throw new Error('Invalid query parameters.');
    }
    const { page: validPage, pageSize: validPageSize, search, category, ageFilter } = resultParse.data;
    const offset = (validPage - 1) * validPageSize;

    // 1. Build Dynamic Conditions
    const conditions = [ne(assets.status, 'Disposed')];

    if (search) {
      conditions.push(
        or(
          ilike(assets.assetTag, `%${search}%`),
          ilike(categories.name, `%${search}%`)
        )!
      );
    }

    if (category && category !== 'All') {
      conditions.push(eq(categories.name, category));
    }

    if (ageFilter && ageFilter !== 'All') {
      if (ageFilter === 'This Year') {
        conditions.push(
          sql`EXTRACT(YEAR FROM ${assetPurchases.purchaseDate}) = EXTRACT(YEAR FROM CURRENT_DATE)`
        );
      } else if (ageFilter === 'Last Year') {
        conditions.push(
          sql`EXTRACT(YEAR FROM ${assetPurchases.purchaseDate}) = EXTRACT(YEAR FROM CURRENT_DATE) - 1`
        );
      } else if (ageFilter === 'Older than 3 Years') {
        conditions.push(
          sql`EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM ${assetPurchases.purchaseDate}) > 3`
        );
      }
    }

    const whereClause = and(...conditions);

    // 2. Get Total Count for Pagination Metadata
    const totalCountRes = await db
      .select({ value: count() })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .where(whereClause);

    const totalRows = totalCountRes[0].value;

    // 3. Fetch ONLY the requested page slice
    const result = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        categoryName: categories.name,
        purchaseDate: assetPurchases.purchaseDate,
        originalPrice: assetPurchases.totalCost,
        currencyCode: assetPurchases.currencyCode,
        usefulLifeMonths: assets.usefulLifeMonths,
        salvageValue: assets.salvageValue,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .where(whereClause)
      .orderBy(desc(assetPurchases.purchaseDate))
      .limit(validPageSize)
      .offset(offset);

    const ledgers = result.map((row) => {
      const price = parseFloat(row.originalPrice?.toString() || '0');
      const salvage = parseFloat(row.salvageValue?.toString() || '0');
      const bookValue = calculateCurrentBookValue({
        cost: price,
        salvageValue: salvage,
        usefulLifeMonths: row.usefulLifeMonths,
        purchaseDate: row.purchaseDate,
      });

      return {
        id: row.id,
        assetId: row.assetTag,
        category: row.categoryName,
        purchaseDate: row.purchaseDate,
        originalPrice: price,
        currencyCode: row.currencyCode || 'LKR',
        expectedLifespan: `${(row.usefulLifeMonths || 60) / 12} years`,
        currentBookValue: Math.round(bookValue * 100) / 100,
      };
    });

    return {
      data: ledgers,
      meta: {
        total: totalRows,
        page: validPage,
        pageSize: validPageSize,
        totalPages: Math.ceil(totalRows / validPageSize),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error(
      '[getDepreciationLedger] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' ||
        error.message === 'Forbidden' ||
        error.message === 'Invalid query parameters.')
    ) {
      throw error;
    }
    throw new Error('Failed to load depreciation ledger.');
  }
}

/**
 * US-22.3: Total Cost of Ownership (TCO)
 * Aggregates base purchase price with SUM(actualCost) from maintenance tickets.
 */
export async function getTCOLedger(
  params: LedgerPaginationParams & { costFilter?: string } = {}
) {
  try {
    await enforceFinanceAccess();

    const resultParse = tcoLedgerParamsSchema.safeParse(params);
    if (!resultParse.success) {
      throw new Error('Invalid query parameters.');
    }
    const { page: validPage, pageSize: validPageSize, search, category, costFilter } = resultParse.data;
    const offset = (validPage - 1) * validPageSize;

    const repairCostsSq = db.$with('repair_costs_sq').as(
      db
        .select({
          assetId: maintenanceTickets.assetId,
          totalRepair:
            sql<number>`COALESCE(SUM(${maintenanceTickets.actualCost}), 0)`.as(
              'totalRepair'
            ),
        })
        .from(maintenanceTickets)
        .where(eq(maintenanceTickets.status, 'COMPLETED'))
        .groupBy(maintenanceTickets.assetId)
    );

    // 1. Build Dynamic Conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(assets.assetTag, `%${search}%`),
          ilike(categories.name, `%${search}%`)
        )!
      );
    }

    if (category && category !== 'All') {
      conditions.push(eq(categories.name, category));
    }

    if (costFilter && costFilter !== 'All') {
      const totalTcoSql = sql`COALESCE(${assetPurchases.totalCost}, 0) + COALESCE(${repairCostsSq.totalRepair}, 0)`;
      if (costFilter === 'High Value (>$1000)')
        conditions.push(sql`${totalTcoSql} > 1000`);
      else if (costFilter === 'Medium Value ($500-$1000)')
        conditions.push(sql`${totalTcoSql} >= 500 AND ${totalTcoSql} <= 1000`);
      else if (costFilter === 'Low Value (<$500)')
        conditions.push(sql`${totalTcoSql} < 500`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 2. Get Total Count
    const totalCountRes = await db
      .with(repairCostsSq)
      .select({ value: count() })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .leftJoin(repairCostsSq, eq(assets.id, repairCostsSq.assetId))
      .where(whereClause);

    const totalRows = totalCountRes[0].value;

    // 3. Fetch Page Slice
    const result = await db
      .with(repairCostsSq)
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        categoryName: categories.name,
        purchaseDate: assetPurchases.purchaseDate,
        originalPrice: assetPurchases.totalCost,
        currencyCode: assetPurchases.currencyCode,
        totalRepairCosts: repairCostsSq.totalRepair,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .leftJoin(repairCostsSq, eq(assets.id, repairCostsSq.assetId))
      .where(whereClause)
      .orderBy(desc(assetPurchases.purchaseDate))
      .limit(validPageSize)
      .offset(offset);

    const ledgers = result.map((row) => {
      const price = parseFloat(row.originalPrice?.toString() || '0');
      const repairs = parseFloat(row.totalRepairCosts?.toString() || '0');

      return {
        id: row.id,
        assetId: row.assetTag,
        category: row.categoryName,
        purchaseDate: row.purchaseDate,
        originalPrice: price,
        currencyCode: row.currencyCode || 'LKR',
        totalRepairCosts: repairs,
        totalTCO: price + repairs,
      };
    });

    return {
      data: ledgers,
      meta: {
        total: totalRows,
        page: validPage,
        pageSize: validPageSize,
        totalPages: Math.ceil(totalRows / validPageSize),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error(
      '[getTCOLedger] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' ||
        error.message === 'Forbidden' ||
        error.message === 'Invalid query parameters.')
    ) {
      throw error;
    }
    throw new Error('Failed to load TCO ledger.');
  }
}

/**
 * US-22.4: Write-Offs & Salvage Ledger
 * Fetches only disposed assets and maps their locked-in financial history.
 */
export async function getWriteOffsLedger(
  params: LedgerPaginationParams & { salvageFilter?: string } = {}
) {
  try {
    await enforceFinanceAccess();

    const resultParse = writeOffsLedgerParamsSchema.safeParse(params);
    if (!resultParse.success) {
      throw new Error('Invalid query parameters.');
    }
    const { page: validPage, pageSize: validPageSize, search, category, salvageFilter } = resultParse.data;
    const offset = (validPage - 1) * validPageSize;

    // 1. Build Dynamic Conditions
    const conditions = [eq(assetDisposals.status, 'Completed')];

    if (search) {
      conditions.push(
        or(
          ilike(assets.assetTag, `%${search}%`),
          ilike(categories.name, `%${search}%`)
        )!
      );
    }

    if (category && category !== 'All') {
      conditions.push(eq(categories.name, category));
    }

    if (salvageFilter && salvageFilter !== 'All') {
      // Use numeric comparison instead of string equality for decimal values
      if (salvageFilter === 'Zero Salvage ($0)')
        conditions.push(
          sql`CAST(${assetDisposals.actualSalvageValue} AS DECIMAL) = 0`
        );
      else if (salvageFilter === 'Low Salvage (<$100)')
        conditions.push(
          and(
            sql`CAST(${assetDisposals.actualSalvageValue} AS DECIMAL) > 0`,
            sql`CAST(${assetDisposals.actualSalvageValue} AS DECIMAL) < 100`
          )!
        );
      else if (salvageFilter === 'High Salvage (>$100)')
        conditions.push(
          sql`CAST(${assetDisposals.actualSalvageValue} AS DECIMAL) >= 100`
        );
    }

    const whereClause = and(...conditions);

    // 2. Get Total Count
    const totalCountRes = await db
      .select({ value: count() })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .innerJoin(assetDisposals, eq(assets.id, assetDisposals.assetId))
      .where(whereClause);

    const totalRows = totalCountRes[0].value;

    // 3. Fetch Page Slice
    const result = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        categoryName: categories.name,
        disposalDate: assetDisposals.resolvedAt,
        originalPrice: assetPurchases.totalCost,
        currencyCode: assetPurchases.currencyCode,
        bookValueAtDisposal: assetDisposals.bookValueAtDisposal,
        estimatedSalvageValue: assets.salvageValue,
        actualSalvageValue: assetDisposals.actualSalvageValue,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .innerJoin(assetDisposals, eq(assets.id, assetDisposals.assetId))
      .where(whereClause)
      .orderBy(desc(assetDisposals.resolvedAt))
      .limit(validPageSize)
      .offset(offset);

    const ledgers = result.map((row) => ({
      id: row.id,
      assetId: row.assetTag,
      category: row.categoryName,
      disposalDate: row.disposalDate,
      originalPrice: parseFloat(row.originalPrice?.toString() || '0'),
      currencyCode: row.currencyCode || 'LKR',
      bookValue: parseFloat(row.bookValueAtDisposal?.toString() || '0'),
      estimatedSalvageValue: parseFloat(row.estimatedSalvageValue?.toString() || '0'),
      actualSalvageValue: parseFloat(row.actualSalvageValue?.toString() || '0'),
    }));

    return {
      data: ledgers,
      meta: {
        total: totalRows,
        page: validPage,
        pageSize: validPageSize,
        totalPages: Math.ceil(totalRows / validPageSize),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error(
      '[getWriteOffsLedger] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' ||
        error.message === 'Forbidden' ||
        error.message === 'Invalid query parameters.')
    ) {
      throw error;
    }
    throw new Error('Failed to load write-offs ledger.');
  }
}