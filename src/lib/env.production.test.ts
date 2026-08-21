/**
 * @vitest-environment node
 *
 * SEC-C — production environment hardening.
 *
 * These variables are all optional at the type level because development and
 * test runs do not need them. In production their absence is a silent failure:
 * missing Redis credentials, for example, remove API rate limiting entirely
 * without any startup signal. The schema must reject that at boot.
 */

import { describe, expect, it } from 'vitest';

import { createServerEnvSchema } from '@/lib/env';

const PRODUCTION_ENV = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@db.example.com/eitams',
  NEXTAUTH_URL: 'https://assets.example.com',
  NEXTAUTH_SECRET: 'a-production-nextauth-secret-of-sufficient-length',
  MOBILE_JWT_SECRET: 'a-production-mobile-jwt-secret-of-sufficient-length',
  KEYCLOAK_CLIENT_ID: 'eitams',
  KEYCLOAK_CLIENT_SECRET: 'keycloak-secret',
  KEYCLOAK_ISSUER: 'https://sso.example.com/realms/eitams',
  ENCRYPTION_SECRET: 'dGVzdC1zZWNyZXQtbWluLTE2LWNoYXJzLWZvci1lcmk=',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
  UPSTASH_REDIS_REST_TOKEN: 'redis-token',
  PRIVATE_BLOB_READ_WRITE_TOKEN: 'blob-token',
  QSTASH_CURRENT_SIGNING_KEY: 'sig-current',
  QSTASH_NEXT_SIGNING_KEY: 'sig-next',
};

const enforced = createServerEnvSchema(true);

function issuePaths(env: Record<string, unknown>): string[] {
  const result = enforced.safeParse(env);
  if (result.success) return [];
  return result.error.issues.map((issue) => String(issue.path[0]));
}

describe('production environment validation', () => {
  it('accepts a fully configured production environment', () => {
    expect(enforced.safeParse(PRODUCTION_ENV).success).toBe(true);
  });

  it.each([
    'ENCRYPTION_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'PRIVATE_BLOB_READ_WRITE_TOKEN',
    'QSTASH_CURRENT_SIGNING_KEY',
    'QSTASH_NEXT_SIGNING_KEY',
  ])('rejects production when %s is missing', (key) => {
    const env: Record<string, unknown> = { ...PRODUCTION_ENV };
    delete env[key];

    expect(issuePaths(env)).toContain(key);
  });

  it('rejects a plaintext deployed NEXTAUTH_URL', () => {
    expect(
      issuePaths({
        ...PRODUCTION_ENV,
        NEXTAUTH_URL: 'http://assets.example.com',
      })
    ).toContain('NEXTAUTH_URL');
  });

  it('rejects a plaintext deployed KEYCLOAK_ISSUER', () => {
    expect(
      issuePaths({
        ...PRODUCTION_ENV,
        KEYCLOAK_ISSUER: 'http://sso.example.com/realms/eitams',
      })
    ).toContain('KEYCLOAK_ISSUER');
  });

  it('exempts loopback origins so a local production build still works', () => {
    const result = enforced.safeParse({
      ...PRODUCTION_ENV,
      NEXTAUTH_URL: 'http://localhost:3000',
    });

    expect(result.success).toBe(true);
  });

  it('leaves development and test environments unconstrained', () => {
    const minimalDev = {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://test:test@localhost/test',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'a-development-secret-of-at-least-32-chars',
      MOBILE_JWT_SECRET: 'a-development-mobile-secret-of-32-chars-min',
      KEYCLOAK_CLIENT_ID: 'dev',
      KEYCLOAK_CLIENT_SECRET: 'dev',
      KEYCLOAK_ISSUER: 'http://localhost:8080/realms/dev',
    };

    expect(enforced.safeParse(minimalDev).success).toBe(true);
  });

  it('skips the production rules during the build phase', () => {
    const buildTime = createServerEnvSchema(false);
    const env: Record<string, unknown> = { ...PRODUCTION_ENV };
    delete env.QSTASH_CURRENT_SIGNING_KEY;
    delete env.PRIVATE_BLOB_READ_WRITE_TOKEN;

    // `next build` runs with NODE_ENV=production but needs no runtime secrets.
    expect(buildTime.safeParse(env).success).toBe(true);
  });
});
