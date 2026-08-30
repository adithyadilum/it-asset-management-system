import { describe, expect, it } from 'vitest';

import { isPublicAssetPath } from '@/lib/auth/public-paths';

describe('isPublicAssetPath', () => {
  it.each([
    '/_next/static/chunks/main.js',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/fonts/NotoSans-Regular.ttf',
    '/tiqri-logo.png',
    '/arrow-down-double.svg',
  ])('treats %s as a public static asset', (pathname) => {
    expect(isPublicAssetPath(pathname)).toBe(true);
  });

  it.each([
    '/dashboard',
    '/assets/hardware',
    '/settings/roles',
    '/reports/audit-log',
    '/my-assets',
  ])('treats %s as a protected application route', (pathname) => {
    expect(isPublicAssetPath(pathname)).toBe(false);
  });

  it.each([
    '/reports/export.csv',
    '/financials/ledger.xlsx',
    '/assets/inventory.pdf',
    '/reports/audit.log',
    '/backup.sql',
    '/config.env',
  ])(
    'does not let %s bypass the proxy just because it ends in an extension',
    (pathname) => {
      // The previous `/\.[a-z0-9]+$/i` rule matched any suffix, so a route like
      // this would have skipped auth and RBAC entirely.
      expect(isPublicAssetPath(pathname)).toBe(false);
    }
  );
});
