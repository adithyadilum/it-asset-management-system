//web/src/db/seed.ts
import '../lib/load-env';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { serverEnv } from '../lib/env';

import { seedAssets } from './seed.assets';

type Db = ReturnType<typeof drizzle>;

async function disableAuditImmutabilityTrigger(db: Db) {
  try {
    await db.execute(
      sql`ALTER TABLE IF EXISTS system_audit_logs DISABLE TRIGGER enforce_audit_immutability;`
    );
  } catch {
    // ignore if trigger/table doesn't exist
  }
}

async function enableAuditImmutabilityTrigger(db: Db) {
  try {
    await db.execute(
      sql`ALTER TABLE IF EXISTS system_audit_logs ENABLE TRIGGER enforce_audit_immutability;`
    );
  } catch {
    // ignore if trigger/table doesn't exist
  }
}

async function seed() {
  const databaseUrl = serverEnv.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in .env.local');
  }

  const db = drizzle(neon(databaseUrl));

  console.log('🌱 Starting seed: fill core reference and transactional tables');

  let triggerDisabled = false;

  try {
    await disableAuditImmutabilityTrigger(db);
    triggerDisabled = true;

    await seedAssets();

    console.log(
      '\n✅ Seed completed: every current table has baseline sample data.'
    );
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  } finally {
    if (triggerDisabled) {
      await enableAuditImmutabilityTrigger(db);
    }
  }
}

seed().catch((error) => {
  console.error('❌ Unhandled error during seed:', error);
  process.exitCode = 1;
});
