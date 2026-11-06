/** @vitest-environment node */
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Pool, type PoolClient } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import { protectNeonConnections } from './neon-recovery';

describe('Neon connection recovery', () => {
  beforeEach(() =>
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  );
  function setup() {
    const pool = new Pool({
      connectionString: 'postgresql://test@localhost/test',
    });
    const client = Object.assign(new EventEmitter(), {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    });
    vi.spyOn(pool, 'connect').mockImplementation(
      async () => client as unknown as PoolClient
    );
    const db = drizzle(pool, { schema });
    protectNeonConnections(db, pool);
    return { pool, client, db };
  }
  it('discards a connection when BEGIN fails, without replaying the transaction', async () => {
    const { client, db } = setup();
    client.query.mockRejectedValue(
      new Error('Connection terminated unexpectedly')
    );
    const callback = vi.fn();
    await expect(db.transaction(callback)).rejects.toThrow();
    expect(callback).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
  });
  it('releases a committed connection once', async () => {
    const { client, db } = setup();
    expect(await db.transaction(async () => 42)).toBe(42);
    expect(client.query.mock.calls.map(([query]) => query.text.trim())).toEqual(
      ['begin', 'commit']
    );
    expect(client.release).toHaveBeenCalledExactlyOnceWith(undefined);
  });
  it('releases a failed callback after rollback, without repeating its writes', async () => {
    const { client, db } = setup();
    const failure = new Error('Validation failed');
    const callback = vi.fn().mockRejectedValue(failure);
    await expect(db.transaction(callback)).rejects.toBe(failure);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls.map(([q]) => q.text.trim())).toEqual([
      'begin',
      'rollback',
    ]);
    expect(client.release).toHaveBeenCalledExactlyOnceWith(failure);
  });
  it('handles idle and checked-out client errors, including after hot reload', () => {
    const { pool, client, db } = setup();
    protectNeonConnections(db, pool);
    pool.emit('acquire', client);
    pool.emit('acquire', client);
    expect(pool.listenerCount('error')).toBe(1);
    expect(client.listenerCount('error')).toBe(1);
    expect(() =>
      pool.emit('error', new Error('Connection terminated unexpectedly'))
    ).not.toThrow();
    expect(() =>
      client.emit('error', new Error('Connection terminated unexpectedly'))
    ).not.toThrow();
  });
});
