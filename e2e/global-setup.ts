import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { db } from '../src/db';
import { users } from '../src/db/schema';

async function globalSetup() {
  console.log('[Global Setup] Loading test environment variables...');
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
  
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl.includes('localhost')) {
    throw new Error(`E2E refused: DATABASE_URL is not localhost (got: ${dbUrl})`);
  }
  
  console.log('[Global Setup] Spinning up test database...');
  execSync('npm run test:db:up', { stdio: 'inherit' });
  
  console.log('[Global Setup] Pushing clean schema to test database...');
  // Pass --force to bypass strict: true interactive prompts in CI
  execSync(`npx drizzle-kit push --force`, { stdio: 'inherit' });
  
  console.log('[Global Setup] Seeding test users...');
  await db.insert(users).values([
    { id: '00000000-0000-0000-0000-000000000001',    email: 'admin@tiqri.test',    name: 'Test Admin',    role: 'GlobalAdmin' as const },
    { id: '00000000-0000-0000-0000-000000000002', email: 'employee@tiqri.test', name: 'Test Employee', role: 'Employee' as const    },
  ]).onConflictDoNothing();
}

export default globalSetup;
