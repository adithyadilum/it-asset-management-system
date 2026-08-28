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
  locations,
} from '@/db/schema';
import { eq, sql, desc, and, ne, ilike, or, count } from 'drizzle-orm';
import { unstable_rethrow } from 'next/navigation';
import { enforceActionAccess } from '@/actions/auth';
import { convertCurrencyAmount, SUMMARY_CURRENCY } from '@/lib/currency';
import {
  DEFAULT_USEFUL_LIFE_MONTHS,
  calculateCurrentBookValue,
  calculateMonthsElapsed,
  projectBookValueSeries,
} from '@/lib/depreciation';
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
  pillar?: string;
  location?: string;
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
    const {
      page: validPage,
      pageSize: validPageSize,
      search,
      category,
      pillar,
      location,
      ageFilter,
    } = resultParse.data;
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

    if (pillar && pillar !== 'All') {
      conditions.push(eq(categories.pillar, pillar));
    }

    if (location && location !== 'All') {
      // A subquery rather than a join: the count and summary queries would each
      // need the same join added, and a stray one would change their row count.
      conditions.push(
        sql`${assets.locationId} IN (SELECT ${locations.id} FROM ${locations} WHERE ${locations.name} = ${location})`
      );
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

    const result = await db
      .select({
        totalCount: sql<number>`count(*) over()::int`,
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

    let totalRows = result[0]?.totalCount ?? 0;
    if (result.length === 0 && validPage > 1) {
      const totalCountRes = await db
        .select({ value: count() })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
        .where(whereClause);
      totalRows = totalCountRes[0]?.value ?? 0;
    }

    const ledgers = result.map((row) => {
      const price = parseFloat(row.originalPrice?.toString() || '0');
      const salvage = parseFloat(row.salvageValue?.toString() || '0');
      const bookValue = calculateCurrentBookValue({
        cost: price,
        salvageValue: salvage,
        usefulLifeMonths: row.usefulLifeMonths,
        purchaseDate: row.purchaseDate,
      });

      const lifeMonths = row.usefulLifeMonths || DEFAULT_USEFUL_LIFE_MONTHS;
      const monthsElapsed = Math.min(
        lifeMonths,
        Math.max(0, calculateMonthsElapsed(row.purchaseDate))
      );

      return {
        id: row.id,
        assetId: row.assetTag,
        category: row.categoryName,
        purchaseDate: row.purchaseDate,
        originalPrice: price,
        currencyCode: row.currencyCode || 'LKR',
        expectedLifespan: `${lifeMonths / 12} years`,
        // The column showed a life but never how much of it was left, which is
        // the number a reviewer is actually after.
        lifeMonths,
        monthsElapsed,
        currentBookValue: Math.round(bookValue * 100) / 100,
      };
    });

    // Totals across everything the filters match, not just the page. Computed
    // from the same inputs the rows use so the header cannot disagree with the
    // table under it.
    const summaryRows = await db
      .select({
        originalPrice: assetPurchases.totalCost,
        currencyCode: assetPurchases.currencyCode,
        salvageValue: assets.salvageValue,
        usefulLifeMonths: assets.usefulLifeMonths,
        purchaseDate: assetPurchases.purchaseDate,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .where(whereClause);

    // Every total below is normalised to LKR before being added up. Assets are
    // purchased in three currencies and the rows carry their native one, so
    // summing them raw would produce a number in no currency at all.
    const toLkr = (value: unknown, from: string | null) =>
      convertCurrencyAmount(
        parseFloat(value?.toString() || '0'),
        from || 'LKR',
        SUMMARY_CURRENCY
      );

    const bookValueSeries = projectBookValueSeries(
      summaryRows.map((row) => ({
        cost: toLkr(row.originalPrice, row.currencyCode),
        salvageValue: toLkr(row.salvageValue, row.currencyCode),
        usefulLifeMonths: row.usefulLifeMonths,
        purchaseDate: row.purchaseDate,
      }))
    );

    let totalCost = 0;
    let totalBookValue = 0;
    let fullyDepreciated = 0;

    for (const row of summaryRows) {
      const price = toLkr(row.originalPrice, row.currencyCode);
      const salvage = toLkr(row.salvageValue, row.currencyCode);
      const bookValue = calculateCurrentBookValue({
        cost: price,
        salvageValue: salvage,
        usefulLifeMonths: row.usefulLifeMonths,
        purchaseDate: row.purchaseDate,
      });

      totalCost += price;
      totalBookValue += bookValue;
      // "Fully depreciated" means written down to salvage, which is the floor
      // calculateStraightLineNBV clamps to.
      if (bookValue <= salvage + 0.005) fullyDepreciated += 1;
    }

    return {
      data: ledgers,
      summary: {
        bookValueSeries,
        totalCost: Math.round(totalCost * 100) / 100,
        totalBookValue: Math.round(totalBookValue * 100) / 100,
        accumulatedDepreciation:
          Math.round((totalCost - totalBookValue) * 100) / 100,
        fullyDepreciated,
        assetCount: summaryRows.length,
        // Depreciation steps in whole calendar months, so a figure that does
        // not move between visits is correct rather than stale. Saying when it
        // was computed makes that legible.
        asOf: new Date().toISOString(),
      },
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
    const {
      page: validPage,
      pageSize: validPageSize,
      search,
      category,
      pillar,
      location,
      costFilter,
    } = resultParse.data;
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

    if (pillar && pillar !== 'All') {
      conditions.push(eq(categories.pillar, pillar));
    }

    if (location && location !== 'All') {
      // A subquery rather than a join: the count and summary queries would each
      // need the same join added, and a stray one would change their row count.
      conditions.push(
        sql`${assets.locationId} IN (SELECT ${locations.id} FROM ${locations} WHERE ${locations.name} = ${location})`
      );
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

    const result = await db
      .with(repairCostsSq)
      .select({
        totalCount: sql<number>`count(*) over()::int`,
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

    let totalRows = result[0]?.totalCount ?? 0;
    if (result.length === 0 && validPage > 1) {
      const totalCountRes = await db
        .with(repairCostsSq)
        .select({ value: count() })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
        .leftJoin(repairCostsSq, eq(assets.id, repairCostsSq.assetId))
        .where(whereClause);
      totalRows = totalCountRes[0]?.value ?? 0;
    }

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

    // Totals across everything the filters match. Purchase and maintenance are
    // kept apart because the question this page answers is how much an asset
    // has cost *since* it was bought.
    const summaryRows = await db
      .select({
        originalPrice: assetPurchases.totalCost,
        currencyCode: assetPurchases.currencyCode,
        totalRepairCosts: repairCostsSq.totalRepair,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .leftJoin(repairCostsSq, eq(assets.id, repairCostsSq.assetId))
      .where(whereClause);

    let totalPurchase = 0;
    let totalMaintenance = 0;
    let maintainedCount = 0;

    for (const row of summaryRows) {
      const price = convertCurrencyAmount(
        parseFloat(row.originalPrice?.toString() || '0'),
        row.currencyCode || 'LKR',
        SUMMARY_CURRENCY
      );
      const repairs = convertCurrencyAmount(
        parseFloat(row.totalRepairCosts?.toString() || '0'),
        row.currencyCode || 'LKR',
        SUMMARY_CURRENCY
      );
      totalPurchase += price;
      totalMaintenance += repairs;
      if (repairs > 0) maintainedCount += 1;
    }

    return {
      data: ledgers,
      summary: {
        totalPurchase: Math.round(totalPurchase * 100) / 100,
        totalMaintenance: Math.round(totalMaintenance * 100) / 100,
        totalTCO: Math.round((totalPurchase + totalMaintenance) * 100) / 100,
        maintenanceShare:
          totalPurchase > 0
            ? Math.round((totalMaintenance / totalPurchase) * 1000) / 10
            : 0,
        maintainedCount,
        assetCount: summaryRows.length,
        asOf: new Date().toISOString(),
      },
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
    const {
      page: validPage,
      pageSize: validPageSize,
      search,
      category,
      pillar,
      location,
      salvageFilter,
    } = resultParse.data;
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

    if (pillar && pillar !== 'All') {
      conditions.push(eq(categories.pillar, pillar));
    }

    if (location && location !== 'All') {
      // A subquery rather than a join: the count and summary queries would each
      // need the same join added, and a stray one would change their row count.
      conditions.push(
        sql`${assets.locationId} IN (SELECT ${locations.id} FROM ${locations} WHERE ${locations.name} = ${location})`
      );
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

    const result = await db
      .select({
        totalCount: sql<number>`count(*) over()::int`,
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

    let totalRows = result[0]?.totalCount ?? 0;
    if (result.length === 0 && validPage > 1) {
      const totalCountRes = await db
        .select({ value: count() })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
        .innerJoin(assetDisposals, eq(assets.id, assetDisposals.assetId))
        .where(whereClause);
      totalRows = totalCountRes[0]?.value ?? 0;
    }

    const ledgers = result.map((row) => ({
      id: row.id,
      assetId: row.assetTag,
      category: row.categoryName,
      disposalDate: row.disposalDate,
      originalPrice: parseFloat(row.originalPrice?.toString() || '0'),
      currencyCode: row.currencyCode || 'LKR',
      bookValue: parseFloat(row.bookValueAtDisposal?.toString() || '0'),
      estimatedSalvageValue: parseFloat(
        row.estimatedSalvageValue?.toString() || '0'
      ),
      actualSalvageValue: parseFloat(row.actualSalvageValue?.toString() || '0'),
    }));

    // Realised against expected is the question this page exists to answer:
    // whether disposals recovered what they were forecast to.
    const summaryRows = await db
      .select({
        bookValueAtDisposal: assetDisposals.bookValueAtDisposal,
        currencyCode: assetPurchases.currencyCode,
        estimatedSalvageValue: assets.salvageValue,
        actualSalvageValue: assetDisposals.actualSalvageValue,
        status: assetDisposals.status,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .innerJoin(assetDisposals, eq(assets.id, assetDisposals.assetId))
      .where(whereClause);

    let totalWrittenOff = 0;
    let totalExpectedSalvage = 0;
    let totalRealisedSalvage = 0;
    // Grouped by outcome because "did disposals recover what we expected?" is
    // a different question for a sale than for a write-off.
    const byStatus = new Map<
      string,
      { count: number; expected: number; realised: number }
    >();

    for (const row of summaryRows) {
      // Normalised to one currency before being added up -- assets are bought
      // in three, and the rows carry their native one.
      const toLkr = (value: unknown) =>
        convertCurrencyAmount(
          parseFloat(value?.toString() || '0'),
          row.currencyCode || 'LKR',
          SUMMARY_CURRENCY
        );

      totalWrittenOff += toLkr(row.bookValueAtDisposal);
      totalExpectedSalvage += toLkr(row.estimatedSalvageValue);
      totalRealisedSalvage += toLkr(row.actualSalvageValue);
      const status = row.status ?? 'Unknown';
      const group = byStatus.get(status) ?? {
        count: 0,
        expected: 0,
        realised: 0,
      };
      group.count += 1;
      group.expected += toLkr(row.estimatedSalvageValue);
      group.realised += toLkr(row.actualSalvageValue);
      byStatus.set(status, group);
    }

    return {
      data: ledgers,
      summary: {
        disposalCount: summaryRows.length,
        totalWrittenOff: Math.round(totalWrittenOff * 100) / 100,
        totalExpectedSalvage: Math.round(totalExpectedSalvage * 100) / 100,
        totalRealisedSalvage: Math.round(totalRealisedSalvage * 100) / 100,
        salvageVariance:
          Math.round((totalRealisedSalvage - totalExpectedSalvage) * 100) / 100,
        byStatus: Array.from(byStatus.entries()).map(([status, group]) => ({
          status,
          count: group.count,
          expected: Math.round(group.expected * 100) / 100,
          realised: Math.round(group.realised * 100) / 100,
        })),
        asOf: new Date().toISOString(),
      },
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

/**
 * The values the ledger filters offer.
 *
 * The three ledgers each derived their category list from the rows they had
 * been handed, which is one page -- sixteen assets. Any category absent from
 * that page could not be filtered for, so the filter could not reach the rows
 * it existed to find. Read the distinct values from the tables instead.
 */
export async function getFinancialsFilterOptions() {
  await enforceFinanceAccess();

  const [categoryRows, locationRows] = await Promise.all([
    db
      .selectDistinct({ name: categories.name, pillar: categories.pillar })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.name),
    db
      .selectDistinct({ name: locations.name })
      .from(locations)
      .where(eq(locations.isActive, true))
      .orderBy(locations.name),
  ]);

  return {
    categories: categoryRows.map((row) => row.name),
    pillars: Array.from(new Set(categoryRows.map((row) => row.pillar))).sort(),
    locations: locationRows.map((row) => row.name),
  };
}

export interface FinancialsFilterOptions {
  categories: string[];
  pillars: string[];
  locations: string[];
}
