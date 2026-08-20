import type { UserRole } from '@/types/auth';

// ─── Role Identity Checks (used for conditional UI rendering) ────────────────

export function isGlobalAdmin(role: UserRole): boolean {
  return role === 'GlobalAdmin';
}

export function isITOperator(role: UserRole): boolean {
  return role === 'ITOperator';
}

export function isFinancialAuditor(role: UserRole): boolean {
  return role === 'FinancialAuditor';
}

export function isEmployee(role: UserRole): boolean {
  return role === 'Employee';
}

// ─── Permission Predicates (used for route guards and feature flags) ─────────

/** GlobalAdmin, ITOperator, FinancialAuditor can view the registry. */
export function canViewAssetRegistry(role: UserRole): boolean {
  return (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinancialAuditor'
  );
}

/** GlobalAdmin, ITOperator can create/update/delete assets. */
export function canManageAssets(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'ITOperator';
}

/** GlobalAdmin, FinancialAuditor can access financial ledgers and audits. */
export function canAccessFinancials(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'FinancialAuditor';
}

/** GlobalAdmin, ITOperator can access operations workflows. */
export function canAccessOperations(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'ITOperator';
}

/** GlobalAdmin, FinancialAuditor can view disposal history records. */
export function canViewDisposalHistory(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'FinancialAuditor';
}

/** GlobalAdmin, ITOperator, FinancialAuditor can read the system audit log. */
export function canViewAuditLog(role: UserRole): boolean {
  return (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinancialAuditor'
  );
}

/** All roles except Employee can use the mobile app. */
export function canAccessMobile(role: UserRole): boolean {
  return (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinancialAuditor'
  );
}

// ─── Server-Side Assert Guard ────────────────────────────────────────────────
/** Throws FORBIDDEN if the user's role does not satisfy the given predicate. */
export function requireAccess(
  user: { role: UserRole },
  predicate: (role: UserRole) => boolean
): void {
  if (!predicate(user.role)) {
    throw new Error('FORBIDDEN: Forbidden');
  }
}
