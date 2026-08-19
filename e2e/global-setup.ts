import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import postgres from 'postgres';

/**
 * Prepares the database the e2e run works against.
 *
 * Runs before the web server starts, so anything that throws here stops the run
 * before a browser is launched.
 */
async function globalSetup() {
  console.log('[Global Setup] Loading test environment variables...');
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
  process.env.DATABASE_URL ||= process.env.TEST_DATABASE_URL;

  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!/^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl)) {
    throw new Error(
      `E2E refused: DATABASE_URL is not a local database (got: ${dbUrl})`
    );
  }

  if (!process.env.CI) {
    console.log('[Global Setup] Spinning up test database...');
    execSync('npm run test:db:up', { stdio: 'inherit' });
  }

  console.log('[Global Setup] Applying checked-in migrations...');
  execSync('npm run db:migrate', { stdio: 'inherit' });

  console.log('[Global Setup] Seeding test users...');
  // Deliberately a standalone connection rather than the application's `db`
  // module. Importing that pulls in `@/lib/env` and the whole schema through
  // path aliases the Playwright loader does not resolve the same way tsc does,
  // and it opens a pool with no exposed way to close it -- an open handle in
  // the runner process for the rest of the run. Two rows of fixture data do not
  // need the ORM.
  const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });
  try {
    await sql`
      INSERT INTO "users" ("id", "email", "name", "role")
      VALUES
        ('00000000-0000-0000-0000-000000000001', 'admin@tiqri.test', 'Test Admin', 'GlobalAdmin'),
        ('00000000-0000-0000-0000-000000000002', 'employee@tiqri.test', 'Test Employee', 'Employee')
      ON CONFLICT DO NOTHING
    `;
  } finally {
    await sql.end();
  }
}

export default globalSetup;
