import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';

if (typeof window === 'undefined' && !process.env.TEST_DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
}

export const testEnvSchema = z.object({
  TEST_DATABASE_URL: z.string().url().startsWith('postgresql://'),
  NEXT_PUBLIC_ENABLE_SANDBOX: z.literal('true'),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
  KEYCLOAK_CLIENT_SECRET: z.string().min(1),
  KEYCLOAK_ISSUER: z.string().url(),
});

describe('testEnvSchema', () => {
  it('validates a valid test environment object', () => {
    const validConfig = {
      TEST_DATABASE_URL: 'postgresql://test:test@localhost/test',
      NEXT_PUBLIC_ENABLE_SANDBOX: 'true',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'test-secret',
      KEYCLOAK_CLIENT_ID: 'test-client',
      KEYCLOAK_CLIENT_SECRET: 'test-secret',
      KEYCLOAK_ISSUER: 'http://localhost:8080/realms/test',
    };

    const result = testEnvSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('rejects invalid TEST_DATABASE_URL', () => {
    const invalidConfig = {
      TEST_DATABASE_URL: 'mysql://test:test@localhost/test',
      NEXT_PUBLIC_ENABLE_SANDBOX: 'true',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'test-secret',
      KEYCLOAK_CLIENT_ID: 'test-client',
      KEYCLOAK_CLIENT_SECRET: 'test-secret',
      KEYCLOAK_ISSUER: 'http://localhost:8080/realms/test',
    };

    const result = testEnvSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });
});
