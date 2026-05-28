import { db } from './index';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Adding exchange_rate column...');
    await db.execute(sql`ALTER TABLE asset_purchases ADD COLUMN IF NOT EXISTS exchange_rate numeric(15, 6) DEFAULT '1'`);
    console.log('Done!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
  process.exit(0);
}

main();
