import { execSync } from 'child_process';

async function globalTeardown() {
  if (process.env.CI) return;
  console.log('[Global Teardown] Spinning down test database...');
  try {
    execSync('npm run test:db:down', { stdio: 'inherit' });
  } catch (err) {
    console.error('[Global Teardown] Failed to spin down DB', err);
  }
}

export default globalTeardown;
