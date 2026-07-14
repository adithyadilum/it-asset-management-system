import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { serverEnv } from '@/lib/env';

type AppDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

function createDatabase(): AppDatabase {
  if (serverEnv.DATABASE_URL.includes('localhost')) {
    const queryClient = postgres(serverEnv.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      connection: { application_name: 'eitams' },
    });
    return drizzle(queryClient, { schema }) as unknown as AppDatabase;
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({
    connectionString: serverEnv.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    options: '-c statement_timeout=30000 -c idle_in_transaction_session_timeout=30000',
  });
  return drizzleNeon(pool, { schema }) as unknown as AppDatabase;
}

const globalForDatabase = globalThis as typeof globalThis & { eitamsDb?: AppDatabase };
const db = globalForDatabase.eitamsDb ?? createDatabase();
if (serverEnv.NODE_ENV !== 'production') globalForDatabase.eitamsDb = db;

export { db };
