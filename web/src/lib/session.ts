export const SESSION_COOKIE_NAME = 'session_token' as const;

export type TokenRole = 'GlobalAdmin' | 'ITOperator' | 'FinanceAuditor' | 'Employee';

export function normalizeTokenRole(role: unknown): TokenRole | null {
  if (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinanceAuditor' ||
    role === 'Employee'
  ) {
    return role;
  }

  return null;
}