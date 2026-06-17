import type { UserRole } from '@/types/auth';

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
  return role !== 'Employee';
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

// ─── Assert Guards ────────────────────────────────────────────────────────────
// Throw-style guards for use in server actions. Accept the full user object
// so call-sites can pass `user` directly without extracting the role.

/**
 * Asserts that the user is a GlobalAdmin.
 * Throws 'Forbidden' otherwise.
 */
export function assertAdmin(user: { role: UserRole }): void {
  if (!isGlobalAdmin(user.role)) throw new Error('Forbidden');
}

/**
 * Asserts that the user is a GlobalAdmin or ITOperator.
 * Throws 'Forbidden' otherwise.
 */
export function assertAdminOrOperator(user: { role: UserRole }): void {
  if (!canManageAssets(user.role)) throw new Error('Forbidden');
}

/**
 * Asserts that the user is a GlobalAdmin or FinanceAuditor.
 * Throws 'Forbidden' otherwise.
 */
export function assertAdminOrAuditor(user: { role: UserRole }): void {
  if (!canAccessFinancials(user.role)) throw new Error('Forbidden');
}

/**
 * Asserts that the user is not a plain Employee (i.e. any privileged role).
 * Throws 'Forbidden' otherwise.
 */
export function assertPrivilegedUser(user: { role: UserRole }): void {
  if (!isPrivilegedUser(user.role)) throw new Error('Forbidden');
}
