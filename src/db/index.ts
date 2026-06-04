import { drizzle as drizzleNeon, NeonDatabase } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Export as a union type so TypeScript can resolve queries properly across both drivers
let db: NeonDatabase<typeof schema> | PostgresJsDatabase<typeof schema>;

// Use standard postgres.js driver for local docker testing
if (process.env.DATABASE_URL?.includes('localhost')) {
  const postgres = require('postgres');
  const { drizzle } = require('drizzle-orm/postgres-js');
  const queryClient = postgres(process.env.DATABASE_URL!);
  db = drizzle(queryClient, { schema }) as PostgresJsDatabase<typeof schema>;
} else {
  // Use Neon serverless driver for dev/production
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  db = drizzleNeon(pool, { schema }) as NeonDatabase<typeof schema>;
}

export { db };