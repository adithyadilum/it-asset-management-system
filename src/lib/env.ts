import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';

// In standalone scripts or tools (e.g. database seeds, migrations), load env files manually
if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const serverEnvSchema = z.object({
  // ── Database ──────────────────────────────────────────────
  DATABASE_URL: z.string().url(),

  // ── Auth (NextAuth + Keycloak) ────────────────────────────
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  MOBILE_JWT_SECRET: z.string().min(32),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
  KEYCLOAK_CLIENT_SECRET: z.string().min(1),
  KEYCLOAK_ISSUER: z.string().url(),

  // ── Application ───────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  JWT_SECRET: z.string().min(1).optional(),
  ENABLE_RUNTIME_LOGS: z.enum(['true', 'false']).default('false'),
  RESEND_FROM: z.string().email().optional(),

  // ── QStash (Notification Queue) ───────────────────────────
  QSTASH_URL: z.string().url().optional(),
  QSTASH_TOKEN: z.string().min(1).optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),

  // ── Upstash Redis ─────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ── Encryption ────────────────────────────────────────────
  ENCRYPTION_SECRET: z
    .string()
    .refine((value) => Buffer.from(value, 'base64').length === 32, {
      message: 'must be a base64-encoded 32-byte key',
    })
    .optional(),

  // ── Pusher (Server-only) ──────────────────────────────────
  PUSHER_APP_ID: z.string().min(1).optional(),
  PUSHER_SECRET: z.string().min(1).optional(),

  // ── Rate Limiting ─────────────────────────────────────────
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  API_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),

  // ── Vercel Blob ───────────────────────────────────────────
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  PRIVATE_BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
});

const result = serverEnvSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid server environment variables:');
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  throw new Error(
    'Invalid server environment variables. Fix them in .env or .env.local'
  );
}

export const serverEnv = result.data;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
