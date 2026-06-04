/**
 * Shared audit log mock for server action tests.
 *
 * Captures calls to `logAuditAction` and `logAuditActionTx` for assertion
 * without hitting the database.
 */
import { vi } from 'vitest';

export const mockLogAuditAction = vi.fn().mockResolvedValue(undefined);
export const mockLogAuditActionTx = vi.fn().mockResolvedValue(undefined);

/**
 * Call `vi.mock('@/lib/audit', () => ...)` with these mocks to intercept
 * audit logging in server action tests.
 *
 * Example:
 * ```ts
 * vi.mock('@/lib/audit', () => ({
 *   logAuditAction: mockLogAuditAction,
 *   logAuditActionTx: mockLogAuditActionTx,
 * }));
 * ```
 */
export function resetAuditMocks() {
  mockLogAuditAction.mockClear();
  mockLogAuditActionTx.mockClear();
}
