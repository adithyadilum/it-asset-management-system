/**
 * Shared session mock helpers for server action tests.
 *
 * These helpers mock `getAuthenticatedUser()` from `@/actions/auth`
 * to return different role personas without hitting NextAuth or the DB.
 */
import { vi } from 'vitest';
import type { AuthenticatedUser } from '@/actions/auth';
import {
  ADMIN_USER,
  IT_OPERATOR_USER,
  FINANCE_AUDITOR_USER,
  EMPLOYEE_USER,
} from '@/test/fixtures/users';

/**
 * Mocks `getAuthenticatedUser` on the `@/actions/auth` module.
 * Call this inside a `beforeEach` block after `vi.mock('@/actions/auth')`.
 */
export function mockSessionAs(user: AuthenticatedUser | null) {
  const authModule = vi.mocked(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/actions/auth') as {
      getAuthenticatedUser: () => Promise<AuthenticatedUser | null>;
    }
  );
  authModule.getAuthenticatedUser = vi.fn().mockResolvedValue(user);
}

export function mockGlobalAdmin() {
  mockSessionAs(ADMIN_USER);
}

export function mockITOperator() {
  mockSessionAs(IT_OPERATOR_USER);
}

export function mockFinancialAuditor() {
  mockSessionAs(FINANCE_AUDITOR_USER);
}

export function mockEmployee() {
  mockSessionAs(EMPLOYEE_USER);
}

export function mockUnauthenticated() {
  mockSessionAs(null);
}
