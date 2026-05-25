import type { UserRole } from '@/types/auth';

/**
 * Returns true if the user role is authorized to view the asset registry.
 * GlobalAdmin, ITOperator, and FinanceAuditor have access.
 */
export function canViewAssetRegistry(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'ITOperator' || role === 'FinanceAuditor';
}

/**
 * Returns true if the user role is authorized to modify assets (create, update, delete).
 * GlobalAdmin and ITOperator have access.
 */
export function canManageAssets(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'ITOperator';
}
