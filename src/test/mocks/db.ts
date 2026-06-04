/**
 * Shared Drizzle DB mock factory for unit tests.
 *
 * Every server action that touches the database imports `db` from `@/db`.
 * This module provides a chainable mock that satisfies Drizzle's query-builder
 * API surface without hitting a real Postgres instance.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Chainable query builder mock
// ---------------------------------------------------------------------------

export function createChainableMock(resolvedValue: unknown = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'set',
    'values',
    'from',
    'where',
    'leftJoin',
    'innerJoin',
    'returning',
    'limit',
    'offset',
    'orderBy',
    'groupBy',
    'having',
    'onConflictDoUpdate',
    'onConflictDoNothing',
  ];

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnThis();
  }

  // Terminal methods that resolve
  chain.returning = vi.fn().mockResolvedValue(resolvedValue);
  chain.execute = vi.fn().mockResolvedValue(resolvedValue);

  // Allow `await db.select().from()...` to resolve
  const thenableProxy = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(resolvedValue);
      }
      return target[prop as string];
    },
  });

  return thenableProxy;
}

// ---------------------------------------------------------------------------
// Full DB mock
// ---------------------------------------------------------------------------

export function createMockDb() {
  const selectChain = createChainableMock([]);
  const insertChain = createChainableMock([]);
  const updateChain = createChainableMock([]);
  const deleteChain = createChainableMock([]);

  return {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
    update: vi.fn().mockReturnValue(updateChain),
    delete: vi.fn().mockReturnValue(deleteChain),
    execute: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txMock = createMockDb();
      return fn(txMock);
    }),
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      assets: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      apiKeys: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      webhookSubscriptions: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      models: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    // Expose internal chains for fine-grained assertion
    _chains: {
      select: selectChain,
      insert: insertChain,
      update: updateChain,
      delete: deleteChain,
    },
  };
}
