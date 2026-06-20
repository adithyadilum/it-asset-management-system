import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { serverEnv } from '@/lib/env';

// Export as base PgDatabase so TypeScript can resolve queries properly across both drivers
let db: PgDatabase<PgQueryResultHKT, typeof schema>;

// Use standard postgres.js driver for local docker testing
if (serverEnv.DATABASE_URL?.includes('localhost')) {
  const queryClient = postgres(serverEnv.DATABASE_URL);
  db = drizzle(queryClient, { schema }) as unknown as PgDatabase<PgQueryResultHKT, typeof schema>;
} else {
  // Use Neon serverless driver for dev/production
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: serverEnv.DATABASE_URL });
  db = drizzleNeon(pool, { schema }) as unknown as PgDatabase<PgQueryResultHKT, typeof schema>;
}

export { db };