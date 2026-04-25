// web/src/actions/financials.ts
'use server';

import { db } from '@/db';
import { 
  assets, 
  assetPurchases, 
  models, 
  categories, 
  maintenanceTickets, 
  assetDisposals 
} from '@/db/schema';
import { eq, sql, desc, and, ne } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';

/**
 * Reusable RBAC guard for all financial endpoints
 */
async function enforceFinanceAccess() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  
  if (user.role !== 'GlobalAdmin' && user.role !== 'FinanceAuditor') {
    throw new Error('Forbidden');
  }
  return user;
}

/**
 * US-22.2: The Depreciation Ledger
 * Calculates straight-line depreciation for all active assets.
 */
export async function getDepreciationLedger() {
  try {
    await enforceFinanceAccess();

    const result = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        categoryName: categories.name,
        purchaseDate: assetPurchases.purchaseDate,
        originalPrice: assetPurchases.totalCost,
        usefulLifeMonths: assets.usefulLifeMonths,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .where(ne(assets.status, 'Disposed'))
      .orderBy(desc(assetPurchases.purchaseDate));

    // Perform the Straight-Line depreciation math as a backend aggregation step
    const ledgers = result.map((row) => {
      const price = parseFloat(row.originalPrice?.toString() || '0');
      const lifeMonths = row.usefulLifeMonths || 60; // Fallback to 5 years (60 months)
      let bookValue = price;

      if (row.purchaseDate && price > 0) {
        const pDate = new Date(row.purchaseDate);
        const now = new Date();
        
        // Calculate total months elapsed safely
        const monthsElapsed = 
          (now.getFullYear() - pDate.getFullYear()) * 12 + 
          (now.getMonth() - pDate.getMonth());

        if (monthsElapsed > 0) {
          const depreciationAmount = (price / lifeMonths) * monthsElapsed;
          // Book value cannot drop below 0
          bookValue = Math.max(0, price - depreciationAmount);
        }
      }

      return {
        id: row.id,
        assetId: row.assetTag,
        category: row.categoryName,
        purchaseDate: row.purchaseDate, // YYYY-MM-DD
        originalPrice: price,
        expectedLifespan: `${lifeMonths / 12} years`,
        currentBookValue: Math.round(bookValue * 100) / 100, // Round to 2 decimals
      };
    });

    return ledgers;
  } catch (error) {
    console.error('[getDepreciationLedger] Error:', error);
    throw error;
  }
}

/**
 * US-22.3: Total Cost of Ownership (TCO)
 * Aggregates base purchase price with SUM(actualCost) from maintenance tickets.
 */
export async function getTCOLedger() {
  try {
    await enforceFinanceAccess();

    // Drizzle CTE (Common Table Expression) to pre-aggregate repair costs
    const repairCostsSq = db.$with('repair_costs_sq').as(
      db.select({
        assetId: maintenanceTickets.assetId,
        totalRepair: sql<number>`COALESCE(SUM(${maintenanceTickets.actualCost}), 0)`.as('totalRepair'),
      })
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.status, 'COMPLETED'))
      .groupBy(maintenanceTickets.assetId)
    );

    const result = await db
      .with(repairCostsSq)
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        categoryName: categories.name,
        purchaseDate: assetPurchases.purchaseDate,
        originalPrice: assetPurchases.totalCost,
        totalRepairCosts: repairCostsSq.totalRepair,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .leftJoin(repairCostsSq, eq(assets.id, repairCostsSq.assetId))
      .orderBy(desc(assetPurchases.purchaseDate));

    return result.map((row) => {
      const price = parseFloat(row.originalPrice?.toString() || '0');
      // Coalesce string to float since Drizzle SQL aggregations can return strings in PG
      const repairs = parseFloat(row.totalRepairCosts?.toString() || '0');
      
      return {
        id: row.id,
        assetId: row.assetTag,
        category: row.categoryName,
        purchaseDate: row.purchaseDate,
        originalPrice: price,
        totalRepairCosts: repairs,
        totalTCO: price + repairs,
      };
    });
  } catch (error) {
    console.error('[getTCOLedger] Error:', error);
    throw error;
  }
}

/**
 * US-22.4: Write-Offs & Salvage Ledger
 * Fetches only disposed assets and maps their locked-in financial history.
 */
export async function getWriteOffsLedger() {
  try {
    await enforceFinanceAccess();

    const result = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        categoryName: categories.name,
        disposalDate: assetDisposals.resolvedAt,
        originalPrice: assetPurchases.totalCost,
        bookValueAtDisposal: assetDisposals.bookValueAtDisposal,
        salvageValue: assetDisposals.actualSalvageValue,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
      .innerJoin(assetDisposals, eq(assets.id, assetDisposals.assetId))
      .where(
        and(
          eq(assets.status, 'Disposed'),
          eq(assetDisposals.status, 'Approved') // Or 'Completed' based on your workflow
        )
      )
      .orderBy(desc(assetDisposals.resolvedAt));

    return result.map((row) => ({
      id: row.id,
      assetId: row.assetTag,
      category: row.categoryName,
      disposalDate: row.disposalDate,
      originalPrice: parseFloat(row.originalPrice?.toString() || '0'),
      bookValue: parseFloat(row.bookValueAtDisposal?.toString() || '0'),
      salvageValue: parseFloat(row.salvageValue?.toString() || '0'),
    }));
  } catch (error) {
    console.error('[getWriteOffsLedger] Error:', error);
    throw error;
  }
}