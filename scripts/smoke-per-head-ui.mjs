import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import { encode } from 'next-auth/jwt';
import { chromium, expect } from '@playwright/test';

const url = process.env.FINANCIAL_TEST_DATABASE_URL;
if (
  !url ||
  new URL(url).hostname !== '127.0.0.1' ||
  new URL(url).username !== 'financial_test'
)
  throw new Error(
    'UI verification requires the isolated financial test database.'
  );
const db = postgres(url, { max: 1 });
const server = createServer();
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
await new Promise((done) => server.close(done));
const origin = `http://127.0.0.1:${port}`,
  secret = 'isolated-ui-test-secret-at-least-32-characters';
const directory = join(process.cwd(), 'test-results', 'per-head');
mkdirSync(directory, { recursive: true });
const log = openSync(join(directory, 'server.log'), 'w');
let browser, app;
try {
  app = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'start',
      '-p',
      String(port),
      '-H',
      '127.0.0.1',
    ],
    {
      windowsHide: true,
      stdio: ['ignore', log, log],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DATABASE_URL: url,
        NEXTAUTH_URL: origin,
        NEXTAUTH_SECRET: secret,
        MOBILE_JWT_SECRET: secret,
        KEYCLOAK_CLIENT_ID: 'financial-test',
        KEYCLOAK_CLIENT_SECRET: 'financial-test',
        KEYCLOAK_ISSUER: 'http://127.0.0.1:9/realms/test',
        ENCRYPTION_SECRET: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
        UPSTASH_REDIS_REST_URL: 'http://127.0.0.1:9',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
        PRIVATE_BLOB_READ_WRITE_TOKEN: 'test-token',
        QSTASH_CURRENT_SIGNING_KEY: 'test-key',
        QSTASH_NEXT_SIGNING_KEY: 'test-key',
        PUSHER_APP_ID: 'test-app',
        PUSHER_SECRET: 'test-secret',
      },
    }
  );
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${origin}/api/health/live`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((done) => setTimeout(done, 500));
  }
  if (!ready)
    throw new Error(
      'Isolated application did not start; see test-results/per-head/server.log.'
    );
  browser = await chromium.launch({
    channel:
      process.env.FINANCIAL_BROWSER_CHANNEL ??
      (process.platform === 'win32' ? 'msedge' : 'chromium'),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 },
    acceptDownloads: true,
  });
  const [admin] =
    await db`SELECT id,name,email,role FROM users WHERE role='GlobalAdmin' LIMIT 1`;
  const cookie = await encode({
    secret,
    token: {
      ...admin,
      isActive: true,
      accessTokenExpires: Date.now() + 3600000,
    },
  });
  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: cookie,
      url: origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1'
      ? route.continue()
      : route.abort()
  );
  const page = await context.newPage();
  await page.goto(`${origin}/financials/per-head`);
  await expect(
    page.getByRole('heading', { name: 'Per-head Cost Analysis', exact: true })
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Search people', exact: true })
    .fill(admin.email);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Apply', exact: true })
  ).toBeEnabled();
  await expect(
    page.getByRole('button', { name: /Person B.*b@test.local/ })
  ).toHaveCount(0);
  await page.screenshot({
    path: join(directory, 'ledger.png'),
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export CSV (LKR)', exact: true })
    .click();
  const download = await downloadPromise;
  await download.saveAs(join(directory, 'report.csv'));
  await page
    .getByRole('button', { name: new RegExp(`${admin.name}.*${admin.email}`) })
    .click();
  await expect(
    page.getByText('Currently allocated assets:', { exact: false })
  ).toBeVisible();
  await page.goto(`${origin}/financials/per-head/configuration`);
  await expect(
    page.getByRole('heading', {
      name: 'Cost allocation configuration',
      exact: true,
    })
  ).toBeVisible();
  const basis = page
    .getByRole('heading', { name: 'Correct asset cost basis', exact: true })
    .locator('..');
  await basis.getByLabel('Asset tag', { exact: true }).fill('TST-001');
  await basis.getByLabel('Purchase date', { exact: true }).fill('2026-11-01');
  await basis
    .getByLabel('Total acquisition cost', { exact: true })
    .fill('1000');
  await basis.locator('select[name="currency"]').selectOption('USD');
  await basis.getByLabel('Recorded rate to LKR', { exact: true }).fill('300');
  await basis
    .getByLabel('Residual value (purchase currency)', { exact: true })
    .fill('100');
  await basis.getByLabel('Useful life in months', { exact: true }).fill('12');
  await basis.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(basis.getByRole('status')).toContainText('Saved.');
  await page.screenshot({
    path: join(directory, 'configuration.png'),
    fullPage: true,
  });
  const [auditor] =
    await db`UPDATE users SET role='FinancialAuditor' WHERE email='b@test.local' RETURNING id,name,email,role`;
  const auditorContext = await browser.newContext();
  const auditorCookie = await encode({
    secret,
    token: {
      ...auditor,
      isActive: true,
      accessTokenExpires: Date.now() + 3600000,
    },
  });
  await auditorContext.addCookies([
    {
      name: 'next-auth.session-token',
      value: auditorCookie,
      url: origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const auditorPage = await auditorContext.newPage();
  await auditorPage.goto(`${origin}/financials/per-head`);
  await expect(
    auditorPage.getByRole('heading', {
      name: 'Per-head Cost Analysis',
      exact: true,
    })
  ).toBeVisible();
  await expect(
    auditorPage.getByRole('link', { name: 'Cost configuration', exact: true })
  ).toHaveCount(0);
  await auditorPage.goto(`${origin}/financials/per-head/configuration`);
  await expect(auditorPage).toHaveURL(/\/403$/);
  console.log(
    'Browser verification passed: report filtering, CSV export, person drill-down, admin cost correction, and auditor access.'
  );
} finally {
  if (browser) await browser.close();
  if (app && app.exitCode === null && app.signalCode === null) {
    const closed = new Promise((done) => app.once('exit', done));
    app.kill();
    await closed;
  }
  closeSync(log);
  await db.end();
}
