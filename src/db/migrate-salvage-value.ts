import '../lib/load-env.ts';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { serverEnv } from '../lib/env.ts';

const neonClient = neon(serverEnv.DATABASE_URL);
const db = drizzle(neonClient);

await db.execute(
  sql`ALTER TABLE asset_purchases ADD COLUMN IF NOT EXISTS estimated_salvage_value DECIMAL(12,2)`
);

console.log('Column estimated_salvage_value added to asset_purchases!');
process.exit(0);
