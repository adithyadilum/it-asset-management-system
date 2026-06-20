import type { UserRole } from '@/types/auth';

//functions output boolean values are used for frontend mostly to render conditional UI

/**
 * Returns true if the user has the GlobalAdmin role.
 */
export function isGlobalAdmin(role: UserRole): boolean {
  return role === 'GlobalAdmin';
}

/**
 * Returns true if the user has the ITOperator role.
 */
export function isITOperator(role: UserRole): boolean {
  return role === 'ITOperator';
}

/**
 * Returns true if the user has the FinanceAuditor role.
 */
export function isFinanceAuditor(role: UserRole): boolean {
  return role === 'FinanceAuditor';
}

/**
 * Returns true if the user has the Employee role.
 */
export function isEmployee(role: UserRole): boolean {
  return role === 'Employee';
}

/**
 * Returns true if the user is a privileged member (Admin, IT, Finance) and NOT a standard Employee.
 */
export function isPrivilegedUser(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'ITOperator' || role === 'FinanceAuditor';
}

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

/**
 * Returns true if the user role has access to financial ledgers and audits.
 * GlobalAdmin and FinanceAuditor have access.
 */
export function canAccessFinancials(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'FinanceAuditor';
}

/**
 * Returns true if the user role has access to general IT and operations workflows.
 * GlobalAdmin and ITOperator have access.
 */
export function canAccessOperations(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'ITOperator';
}

/**
 * Returns true if the user role has access to view disposal history.
 * GlobalAdmin and FinanceAuditor have access.
 */
export function canViewDisposalHistory(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'FinanceAuditor';
}

// ─── Assert Guards ────────────────────────────────────────────────────────────
// A generic guard for use in server actions. Evaluates the user's role against
// a provided predicate (e.g. `isGlobalAdmin` or `canManageAssets`).
// Throws an error if the predicate fails.
// This is used for backend 

export function requireAccess(
  user: { role: UserRole },
  predicate: (role: UserRole) => boolean
): void {
  if (!predicate(user.role)) {
    // Include both a stable error code and the human-readable message to keep
    // server-action and test expectations consistent across modules.
    throw new Error('FORBIDDEN: Forbidden');
  }
}
