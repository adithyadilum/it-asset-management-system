import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function globalSetup() {
  console.log('[Global Setup] Loading test environment variables...');
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
  
  console.log('[Global Setup] Spinning up test database...');
  execSync('npm run test:db:up', { stdio: 'inherit' });
  
  console.log('[Global Setup] Pushing clean schema to test database...');
  // Pass --force to bypass strict: true interactive prompts in CI
  execSync(`npx drizzle-kit push --force`, { stdio: 'inherit' });
  
  // Optionally run seeders here
  // execSync('npm run db:seed', { stdio: 'inherit' });
}

export default globalSetup;
