import type { AssetDetailsData } from '@/lib/data/asset-details-repo';
import { canAccessFinancials } from '@/lib/auth/roles';
import type { UserRole } from '@/types/auth';

/**
 * Strips acquisition cost, vendor, and license-key detail from an asset payload
 * for roles that are not entitled to financial data.
 *
 * The asset registry is visible to GlobalAdmin, ITOperator, and FinancialAuditor,
 * but purchase pricing and software license keys are need-to-know even within
 * that set — only the financial roles receive them.
 */
export function redactAssetDetailsForRole(
  details: AssetDetailsData,
  role: UserRole
): AssetDetailsData {
  if (canAccessFinancials(role)) {
    return details;
  }

  return {
    ...details,
    purchase: null,
    vendor: null,
    softwareLicense: details.softwareLicense
      ? { ...details.softwareLicense, licenseKey: null }
      : details.softwareLicense,
  };
}
