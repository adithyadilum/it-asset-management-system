/**
 * Shared Next.js server utility mocks.
 *
 * Provides mock implementations for `revalidatePath`, `headers`, and
 * `cookies` so that server actions can be tested without a running server.
 */
import { vi } from 'vitest';

export const mockRevalidatePath = vi.fn();
export const mockHeaders = vi
  .fn()
  .mockResolvedValue(new Map([['x-forwarded-for', '127.0.0.1']]));

/**
 * Resets all Next.js mocks. Call in `beforeEach`.
 */
export function resetNextMocks() {
  mockRevalidatePath.mockClear();
  mockHeaders.mockClear();
}
