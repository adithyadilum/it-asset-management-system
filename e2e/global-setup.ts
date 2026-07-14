import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function globalSetup() {
  console.log('[Global Setup] Loading test environment variables...');
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
  process.env.DATABASE_URL ||= process.env.TEST_DATABASE_URL;
  
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl.includes('localhost')) {
    throw new Error(`E2E refused: DATABASE_URL is not localhost (got: ${dbUrl})`);
  }
  
  if (!process.env.CI) {
    console.log('[Global Setup] Spinning up test database...');
    execSync('npm run test:db:up', { stdio: 'inherit' });
  }
  
  console.log('[Global Setup] Applying checked-in migrations...');
  execSync('npm run db:migrate', { stdio: 'inherit' });
  
  console.log('[Global Setup] Seeding test users...');
  const [{ db }, { users }] = await Promise.all([
    import('../src/db'),
    import('../src/db/schema'),
  ]);
  await db.insert(users).values([
    { id: '00000000-0000-0000-0000-000000000001',    email: 'admin@tiqri.test',    name: 'Test Admin',    role: 'GlobalAdmin' as const },
    { id: '00000000-0000-0000-0000-000000000002', email: 'employee@tiqri.test', name: 'Test Employee', role: 'Employee' as const    },
  ]).onConflictDoNothing();
}

export default globalSetup;
