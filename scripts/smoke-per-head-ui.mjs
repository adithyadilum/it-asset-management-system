import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { encode } from 'next-auth/jwt';
import { chromium, expect } from '@playwright/test';

const demo = process.argv.includes('--demo');
if (demo) dotenv.config({ quiet: true });
const url = demo
  ? process.env.DATABASE_URL
  : process.env.FINANCIAL_TEST_DATABASE_URL;
if (
  !url ||
  (!demo &&
    (new URL(url).hostname !== '127.0.0.1' ||
      new URL(url).username !== 'financial_test'))
)
  throw new Error(
    'UI verification requires the isolated financial test database.'
  );
const db = postgres(url, { max: 1, ssl: demo ? 'require' : false });
const server = createServer();
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
await new Promise((done) => server.close(done));
const origin = `http://127.0.0.1:${port}`,
  secret = 'isolated-ui-test-secret-at-least-32-characters';
const directory = join(
  process.cwd(),
  'test-results',
  demo ? 'financial-demo' : 'per-head'
);
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
  if (process.argv.includes('--my-assets')) {
    await page.goto(`${origin}/my-assets`);
    await expect(
      page.getByRole('heading', { name: 'My Assets', exact: true })
    ).toBeVisible();
    const equipment = page
      .getByRole('heading', { name: 'Assigned Equipment', exact: true })
      .locator('..');
    await equipment.locator('article[role="button"]').first().click();
    let dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Asset details', exact: true })
    ).toBeVisible();
    await expect(dialog.locator('[data-slot="scroll-area"]')).toBeVisible();
    await page.screenshot({
      path: join(directory, 'my-assets-equipment.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await dialog
      .getByRole('button', { name: 'Close', exact: true })
      .last()
      .click();
    const software = page
      .getByRole('heading', { name: 'Software Access', exact: true })
      .locator('..');
    await software.locator('article[role="button"]').first().click();
    dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText('Software access', { exact: true })
    ).toBeVisible();
    await expect(dialog.getByText(/licen[cs]e key/i)).toHaveCount(0);
    await page.screenshot({
      path: join(directory, 'my-assets-software.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 420, height: 820 });
    await expect(
      dialog.getByRole('button', { name: 'Close', exact: true }).last()
    ).toBeVisible();
    const box = await dialog.boundingBox();
    if (
      !box ||
      box.x < 0 ||
      box.x + box.width > 421 ||
      box.y < 0 ||
      box.y + box.height > 821
    )
      throw new Error('Asset dialog exceeds the viewport.');
    await page.screenshot({
      path: join(directory, 'my-assets-small.png'),
      fullPage: true,
      animations: 'disabled',
    });
    console.log(
      'Read-only My Assets preview passed: equipment, software, employee-safe details and responsive shadcn scrolling.'
    );
  } else {
    await page.goto(`${origin}/financials/per-head`);
    await expect(
      page.getByRole('heading', { name: 'Per-head Cost Analysis', exact: true })
    ).toBeVisible();
    if (demo) {
      await expect(
        page.getByText('Cost over time', { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText('Where the cost goes', { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText('Review required', { exact: false })
      ).toHaveCount(0);
      await expect(page.locator('.recharts-pie-sector').first()).toBeVisible();
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.recharts-bar-rectangle path')].some(
          (p) => p.getBBox().height > 20
        )
      );
      await page.screenshot({
        path: join(directory, 'ledger.png'),
        fullPage: true,
      });
      await page.goto(`${origin}/financials/per-head/configuration`);
      await expect(
        page.getByRole('heading', { name: 'Cost settings', exact: true })
      ).toBeVisible();
      await page.screenshot({
        path: join(directory, 'people-settings.png'),
        fullPage: true,
      });
      await page.getByRole('tab', { name: /Software/ }).click();
      await expect(page.getByText(/unused seats/).first()).toBeVisible();
      await expect(page.getByRole('tab', { name: /Software/ })).toHaveAttribute(
        'data-state',
        'active'
      );
      await page.screenshot({
        path: join(directory, 'software-settings.png'),
        fullPage: true,
      });
      await page
        .getByRole('button', { name: 'Edit', exact: true })
        .first()
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.screenshot({
        path: join(directory, 'software-editor.png'),
        fullPage: true,
      });
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Cancel', exact: true })
        .click();
      await page.setViewportSize({ width: 1024, height: 900 });
      await page.goto(`${origin}/financials/per-head`);
      await expect(
        page.getByRole('heading', {
          name: 'Per-head Cost Analysis',
          exact: true,
        })
      ).toBeVisible();
      await page.screenshot({
        path: join(directory, 'ledger-1024.png'),
        fullPage: true,
      });
      console.log(
        'Read-only exhibition preview passed: populated charts, people, software capacity, and settings dialog.'
      );
    } else {
      const search = page.getByRole('textbox', {
        name: 'Search people',
        exact: true,
      });
      await search.fill(admin.email);
      await expect(
        page.getByRole('button', { name: 'Person B', exact: false })
      ).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: /^PA Person A/ })
      ).toBeVisible();
      await expect(
        page.getByText('Review required', { exact: false })
      ).toHaveCount(0);
      await page.screenshot({
        path: join(directory, 'ledger.png'),
        fullPage: true,
      });
      const downloadPromise = page.waitForEvent('download');
      await page
        .getByRole('button', { name: 'Export CSV', exact: true })
        .click();
      await (await downloadPromise).saveAs(join(directory, 'report.csv'));
      await page
        .getByRole('button', {
          name: `View ${admin.name}'s costs`,
          exact: true,
        })
        .click();
      await expect(
        page.getByText('Currently allocated assets:', { exact: false })
      ).toBeVisible();
      await page.goto(`${origin}/financials/per-head/configuration`);
      await expect(
        page.getByRole('heading', { name: 'Cost settings', exact: true })
      ).toBeVisible();
      await page
        .getByRole('row')
        .filter({ hasText: admin.email })
        .getByRole('button', { name: 'Edit', exact: true })
        .click();
      let dialog = page.getByRole('dialog');
      await dialog
        .getByRole('combobox', { name: 'Workplace', exact: true })
        .click();
      await page
        .getByRole('option', { name: 'Settings Workplace', exact: true })
        .click();
      await dialog
        .getByRole('button', { name: 'Save changes', exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole('row').filter({ hasText: admin.email })
      ).toContainText('Settings Workplace');
      await page.getByRole('tab', { name: /Equipment/ }).click();
      await page
        .getByRole('row')
        .filter({ hasText: 'TST-001' })
        .getByRole('button', { name: 'Edit', exact: true })
        .click();
      dialog = page.getByRole('dialog');
      await dialog
        .getByRole('checkbox', { name: /Shared equipment/ })
        .uncheck();
      await dialog
        .getByRole('button', { name: 'Save changes', exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole('row').filter({ hasText: 'TST-001' })
      ).toContainText('Assigned user');
      await page.getByRole('tab', { name: /Software/ }).click();
      await expect(page.getByText(/unused seats/).first()).toBeVisible();
      await page
        .getByRole('row')
        .filter({ hasText: 'Test Software Model' })
        .getByRole('button', { name: 'Edit', exact: true })
        .click();
      dialog = page.getByRole('dialog');
      await dialog
        .getByRole('spinbutton', { name: 'Total monthly price', exact: true })
        .fill('9500');
      await page.screenshot({
        path: join(directory, 'software-settings.png'),
        fullPage: true,
      });
      await dialog
        .getByRole('button', { name: 'Save changes', exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      const [saved] =
        await db`SELECT amount FROM software_financial_terms WHERE amount=9500`;
      if (!saved) throw new Error('Software settings did not persist.');
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
        auditorPage.getByRole('link', { name: 'Cost settings', exact: true })
      ).toHaveCount(0);
      await auditorPage.goto(`${origin}/financials/per-head/configuration`);
      await expect(auditorPage).toHaveURL(/\/403$/);
      console.log(
        'Browser verification passed: report filtering, CSV export, person drill-down, one-save people/equipment/software settings, and auditor access.'
      );
    }
  }
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
