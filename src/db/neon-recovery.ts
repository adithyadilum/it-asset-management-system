import { Pool, type PoolClient } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import { warnDatabaseUnavailable } from '@/lib/database-recovery';

const poolGuard = Symbol.for('eitams.neon.pool-guard');
const clientGuard = Symbol.for('eitams.neon.client-guard');

export function protectNeonConnections(
  database: NeonDatabase<typeof schema>,
  pool: Pool
): void {
  const guarded = pool as Pool & { [poolGuard]?: boolean };
  if (guarded[poolGuard]) return;
  guarded[poolGuard] = true;

  const protectClient = (client: PoolClient) => {
    const guardedClient = client as PoolClient & { [clientGuard]?: boolean };
    if (guardedClient[clientGuard]) return;
    guardedClient[clientGuard] = true;
    // Checked-out clients can emit errors separately from query rejection.
    client.on('error', warnDatabaseUnavailable);
  };
  pool.on('error', warnDatabaseUnavailable);
  pool.on('connect', protectClient);
  // Also covers clients created before a development hot reload.
  pool.on('acquire', protectClient);

  // Drizzle 0.45 begins the transaction before its own try/finally. Owning the
  // checkout here guarantees release even when BEGIN fails. No write is retried.
  database.transaction = async (callback, config) => {
    const client = await pool.connect();
    let failure: Error | undefined;
    try {
      return await drizzle(client, { schema }).transaction(callback, config);
    } catch (error) {
      failure =
        error instanceof Error ? error : new Error('Transaction failed');
      throw error;
    } finally {
      // Discard failed connections rather than returning them to the idle pool.
      client.release(failure);
    }
  };
}
