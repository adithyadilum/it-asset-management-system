import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';

if (typeof window === 'undefined' && !process.env.TEST_DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
}

const testEnvSchema = z.object({
  TEST_DATABASE_URL: z.string().url().startsWith('postgresql://'),
  NEXT_PUBLIC_ENABLE_SANDBOX: z.literal('true'),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
  KEYCLOAK_CLIENT_SECRET: z.string().min(1),
  KEYCLOAK_ISSUER: z.string().url(),
});

const result = testEnvSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid test environment variables:');
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  throw new Error('Invalid test environment variables. Fix them in .env.test');
}

export const testEnv = result.data;
export type TestEnv = z.infer<typeof testEnvSchema>;
