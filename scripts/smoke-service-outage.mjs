import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { encode } from 'next-auth/jwt';
import { SignJWT } from 'jose';
import { chromium, expect } from '@playwright/test';

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

// Isolated app process with an unreachable local DB. Never reads DATABASE_URL
// from the environment or changes application records, sessions, or SSO tokens.
const port = await unusedPort(),
  databasePort = await unusedPort();
const origin = `http://127.0.0.1:${port}`;
const secret = 'isolated-outage-test-secret-at-least-32-characters';
const user = {
  id: '11111111-2222-4333-8444-555555555555',
  email: 'outage@test.local',
  name: 'Outage Test',
  role: 'ITOperator',
  isActive: true,
};
const directory = join(process.cwd(), 'test-results', 'service-outage');
mkdirSync(directory, { recursive: true });
const log = openSync(join(directory, 'server.log'), 'w');
let app, browser;
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
        DATABASE_URL: `postgresql://outage_test@127.0.0.1:${databasePort}/unavailable`,
        NEXTAUTH_URL: origin,
        NEXTAUTH_SECRET: secret,
        MOBILE_JWT_SECRET: secret,
        KEYCLOAK_CLIENT_ID: 'outage-test',
        KEYCLOAK_CLIENT_SECRET: 'outage-test',
        KEYCLOAK_ISSUER: 'http://127.0.0.1:9/realms/test',
        ENCRYPTION_SECRET: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
        UPSTASH_REDIS_REST_URL: 'http://127.0.0.1:9',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
        PRIVATE_BLOB_READ_WRITE_TOKEN: 'test-token',
        QSTASH_CURRENT_SIGNING_KEY: 'test-key',
        QSTASH_NEXT_SIGNING_KEY: 'test-key',
      },
    }
  );
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(`${origin}/api/health/live`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready)
    throw new Error(
      'Isolated app did not start; see test-results/service-outage/server.log.'
    );
  browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : 'chromium',
    headless: true,
  });
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: await encode({
        secret,
        token: { ...user, accessTokenExpires: Date.now() + 3600000 },
      }),
      url: origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort()
  );
  const page = await context.newPage();
  await page.goto(`${origin}/my-assets`);
  await expect(
    page.getByRole('heading', { name: 'Unable to load this page' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeEnabled();
  await expect(page.locator('body')).not.toContainText('Failed query');
  await expect(page.locator('body')).not.toContainText('outage@test.local');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeEnabled();
  await expect(page).toHaveURL(`${origin}/my-assets`);
  await page.screenshot({ path: join(directory, 'unavailable.png') });

  const response = await context.request.post(`${origin}/api/v1/pusher/auth`, {
    form: { socket_id: '123.456', channel_name: `private-user-${user.id}` },
  });
  expect(response.status()).toBe(503);
  expect(response.headers()['retry-after']).toBe('5');
  expect(await response.json()).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === 'next-auth.session-token'
    )
  ).toBe(true);

  const bearer = await new SignJWT({ id: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(origin)
    .setAudience('eitams-mobile')
    .setJti('outage-test-device')
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
  const mobileResponse = await context.request.get(
    `${origin}/api/v1/assets/my-assets`,
    { headers: { Authorization: `Bearer ${bearer}` } }
  );
  expect(mobileResponse.status()).toBe(503);
  expect(await mobileResponse.json()).toMatchObject({
    code: 'SERVICE_UNAVAILABLE',
  });
  console.log(
    'Outage browser check passed: safe page fallback, retry, retained session, and web/mobile 503 responses.'
  );
} finally {
  await browser?.close();
  app?.kill();
  closeSync(log);
}
