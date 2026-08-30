/**
 * @vitest-environment node
 *
 * Structural guard for CQ-D.
 *
 * SEC-A (`/api/v1/scan`) and SEC-B (`/api/files`) were both authorization checks
 * somebody forgot to write. This test makes that omission impossible to merge:
 * every route handler must state its authorization through a `with*` wrapper,
 * and the handful of routes that legitimately do something else are listed here
 * with a reason.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const API_ROOT = join(process.cwd(), 'src', 'app', 'api');

/** Routes that establish a principal without the shared wrappers, and why. */
const RAW_AUTH_EXEMPTIONS: Record<string, string> = {
  'auth/generate-qr/route.ts':
    'Writes an audit record on denial, so it keeps a bespoke RBAC branch rather than a bare 403.',
};

/** Routes that legitimately have no user principal at all, and why. */
const NO_PRINCIPAL_EXEMPTIONS: Record<string, string> = {
  'auth/[...nextauth]/route.ts': 'NextAuth handler; owns its own session flow.',
  'auth/check-qr-status/route.ts':
    'Pre-authentication polling for a pairing token; returns only a boolean.',
  'auth/mobile-exchange/route.ts':
    'Pre-authentication pairing claim; re-checks the account against the database itself.',
  'health/live/route.ts': 'Unauthenticated liveness probe.',
  'health/ready/route.ts': 'Unauthenticated readiness probe.',
  'qstash/cron/route.ts': 'Authenticated by QStash signature verification.',
  'qstash/email/route.ts': 'Authenticated by QStash signature verification.',
  'qstash/teams/route.ts': 'Authenticated by QStash signature verification.',
};

const RAW_AUTH_CALLS = [
  'getAuthenticatedUserFromRequest(',
  'getAuthenticatedMobileUserFromRequest(',
  'getAuthenticatedUser(',
  'getServerSession(',
];

// Matches both the plain and generic forms, e.g. `withAuth(` and `withAuth<{...}>(`.
const WRAPPER_PATTERN = /(withAuth|withMobileAuth|withSessionAuth)\s*[<(]/;

function collectRouteFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectRouteFiles(full));
    } else if (entry === 'route.ts') {
      found.push(full);
    }
  }
  return found;
}

function toKey(file: string): string {
  return relative(API_ROOT, file).split(sep).join(posix.sep);
}

const routeFiles = collectRouteFiles(API_ROOT).map((file) => ({
  key: toKey(file),
  source: readFileSync(file, 'utf8'),
}));

describe('route handler auth boundary', () => {
  it('finds the API routes to check', () => {
    expect(routeFiles.length).toBeGreaterThan(20);
  });

  it('no route calls a raw auth helper outside the documented exemptions', () => {
    const offenders = routeFiles
      .filter(({ key, source }) => {
        if (key in RAW_AUTH_EXEMPTIONS) return false;
        return RAW_AUTH_CALLS.some((call) => source.includes(call));
      })
      .map(({ key }) => key);

    expect(offenders).toEqual([]);
  });

  it('every route with a principal states its authorization via a wrapper', () => {
    const missing = routeFiles
      .filter(({ key }) => !(key in NO_PRINCIPAL_EXEMPTIONS))
      .filter(({ key }) => !(key in RAW_AUTH_EXEMPTIONS))
      .filter(({ source }) => {
        // External API routes carry their own key-scoped boundary.
        if (source.includes('withApiKey(')) return false;
        return !WRAPPER_PATTERN.test(source);
      })
      .map(({ key }) => key);

    expect(missing).toEqual([]);
  });

  it('every exemption still refers to a route that exists', () => {
    const keys = new Set(routeFiles.map(({ key }) => key));
    const stale = [
      ...Object.keys(RAW_AUTH_EXEMPTIONS),
      ...Object.keys(NO_PRINCIPAL_EXEMPTIONS),
    ].filter((key) => !keys.has(key));

    expect(stale).toEqual([]);
  });
});
