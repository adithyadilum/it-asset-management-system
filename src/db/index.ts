import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { serverEnv } from '@/lib/env';

type AppDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * How long an unused connection is kept before it is closed.
 *
 * Opening one is the expensive part. Measured against the deployed Neon
 * instance: a query on an established connection is ~130ms, while a round of
 * four concurrent queries on a cold pool is ~1230ms and the same round on a
 * warm pool is ~136ms. Reconnecting therefore costs roughly two extra seconds
 * spread across a page that opens a few connections.
 *
 * The previous 20 seconds was shorter than the gap between one page view and
 * the next, so ordinary browsing paid that cost almost every time. The
 * connection string points at Neon's pooler endpoint, which exists precisely to
 * let clients hold connections, so keeping a handful open is what it is for.
 */
const IDLE_TIMEOUT_SECONDS = 300;

function createDatabase(): AppDatabase {
  const databaseHostname = new URL(serverEnv.DATABASE_URL).hostname;
  const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(
    databaseHostname
  );

  if (isLocalDatabase) {
    const queryClient = postgres(serverEnv.DATABASE_URL, {
      max: 10,
      // See the note on the Neon pool below: reconnecting is far more expensive
      // than holding an idle connection, so keep them well past the gap between
      // one page view and the next.
      idle_timeout: IDLE_TIMEOUT_SECONDS,
      connect_timeout: 10,
      connection: { application_name: 'eitams' },
    });
    return drizzle(queryClient, { schema }) as unknown as AppDatabase;
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({
    connectionString: serverEnv.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: IDLE_TIMEOUT_SECONDS * 1000,
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
    application_name: 'eitams',
    // Without this an idle pooled client keeps the event loop alive, so a seed
    // or migration script would sit for the whole idle timeout after finishing.
    allowExitOnIdle: true,
  });

  // Pool emits idle-client errors asynchronously. Without a listener Node
  // treats them as uncaught exceptions and can terminate the dev/prod worker.
  pool.on('error', (error: Error) => {
    console.error('[DB] Unexpected idle Neon connection error:', error.message);
  });

  return drizzleNeon(pool, { schema }) as unknown as AppDatabase;
}

const globalForDatabase = globalThis as typeof globalThis & {
  eitamsDb?: AppDatabase;
};
const db = globalForDatabase.eitamsDb ?? createDatabase();
if (serverEnv.NODE_ENV !== 'production') globalForDatabase.eitamsDb = db;

export { db };
