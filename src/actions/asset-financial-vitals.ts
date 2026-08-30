'use server';

import { logInfo } from '@/lib/latency';
import { enforceActionAccess } from '@/actions/auth';
import { resolveAssetPrimaryId } from '@/lib/data/asset-details-repo';
import {
  getAssetFinancialVitalsByResolvedId,
  type AssetFinancialVitals,
} from '@/lib/data/asset-financial-vitals-repo';

export type { AssetFinancialVitals } from '@/lib/data/asset-financial-vitals-repo';

/**
 * Reusable RBAC guard for financial data.
 * Financial vitals are sensitive and restricted to Admins and Finance auditors.
 */
async function enforceFinanceAccess() {
  const user = await enforceActionAccess();

  if (user.role !== 'GlobalAdmin' && user.role !== 'FinancialAuditor') {
    throw new Error(
      'Forbidden: Insufficient permissions to view financial data.'
    );
  }
  return user;
}

// Removed redundant isValidUuid - using import from lib instead

/**
 * Fetches comprehensive financial vitals for a single asset.
 * This action integrates data from purchases and maintenance to provide a unified financial view.
 */
export async function getAssetFinancialVitals(
  assetId: string
): Promise<AssetFinancialVitals> {
  try {
    await enforceFinanceAccess();

    // 0. Resolve Asset ID (could be tag or UUID)
    const resolvedAssetId = await resolveAssetPrimaryId(assetId);
    if (!resolvedAssetId) {
      throw new Error('Asset not found or invalid ID format');
    }

    return await getAssetFinancialVitalsByResolvedId(resolvedAssetId);
  } catch (error) {
    // Log authorization failures at debug level, not as errors
    const isAuthError =
      error instanceof Error &&
      (error.message.includes('Unauthorized') ||
        error.message.includes('Forbidden'));

    if (isAuthError) {
      logInfo(
        '[getAssetFinancialVitals] Authorization denied for asset %s',
        assetId
      );
      throw error;
    }

    console.error(
      '[getAssetFinancialVitals] Error for asset %s:',
      assetId,
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw new Error('Failed to load financial vitals.');
  }
}
