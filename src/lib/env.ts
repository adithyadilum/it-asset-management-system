import { z } from 'zod';

// Deliberately free of Node-only imports. Next.js populates `process.env` from
// the .env files itself; standalone scripts import `./load-env` first instead.
// Keeping `dotenv`/`path`/`process.cwd()` out of this module keeps it usable
// from the edge proxy, which reaches it through `lib/latency`.

/**
 * Services whose absence in production is a silent failure rather than a loud
 * one. Without these the application still boots, then breaks at the moment a
 * user touches the feature — and in the Redis case it removes rate limiting
 * altogether with no startup signal. They are required in production so a
 * misconfigured deploy fails immediately instead of degrading.
 */
const PRODUCTION_REQUIRED_KEYS = [
  'ENCRYPTION_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'PRIVATE_BLOB_READ_WRITE_TOKEN',
  'QSTASH_CURRENT_SIGNING_KEY',
  'QSTASH_NEXT_SIGNING_KEY',
] as const;

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const baseServerEnvSchema = z.object({
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

  // Set to 'false' once no PBKDF2-hashed API keys remain, so failed lookups
  // stop paying the legacy hashing cost. See src/lib/api/api-key-hash.ts.
  API_KEY_LEGACY_HASH_FALLBACK: z.enum(['true', 'false']).default('true'),

  // ── Rate Limiting ─────────────────────────────────────────
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  API_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),

  // Comma-separated hostnames webhooks may target. Unset means any public host.
  WEBHOOK_ALLOWED_HOSTS: z.string().optional(),

  // ── Vercel Blob ───────────────────────────────────────────
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  PRIVATE_BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof baseServerEnvSchema>;

function isLocalUrl(value: string): boolean {
  try {
    return LOCAL_HOSTNAMES.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

/**
 * Builds the schema with production hardening applied conditionally.
 *
 * `enforceProductionRules` is false during `next build`, which runs with
 * NODE_ENV=production but has no need of runtime service credentials. The
 * checks apply when the server actually starts.
 */
export function createServerEnvSchema(enforceProductionRules: boolean) {
  return baseServerEnvSchema.superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production' || !enforceProductionRules) return;

    for (const key of PRODUCTION_REQUIRED_KEYS) {
      if (!env[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required when NODE_ENV=production`,
        });
      }
    }

    // Deployed origins must be HTTPS. Loopback is exempt so a local production
    // build or smoke run does not trip the check.
    for (const key of ['NEXTAUTH_URL', 'KEYCLOAK_ISSUER'] as const) {
      const value = env[key];
      if (!isLocalUrl(value) && !value.startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} must use HTTPS in production`,
        });
      }
    }
  });
}

// Shape validation runs at import time, including during `next build`, so a
// malformed value is caught as early as possible.
const result = createServerEnvSchema(false).safeParse(process.env);

if (!result.success) {
  console.error('❌ Invalid server environment variables:');
  console.error(
    JSON.stringify(z.flattenError(result.error).fieldErrors, null, 2)
  );
  throw new Error(
    'Invalid server environment variables. Fix them in .env or .env.local'
  );
}

export const serverEnv = result.data;

/**
 * Enforces the production service requirements.
 *
 * Deliberately separate from the import-time parse: `next build` loads this
 * module with NODE_ENV=production but has no need of Redis, blob, or QStash
 * credentials. This runs from `src/instrumentation.ts` when a server actually
 * boots, so a misconfigured deploy fails immediately rather than when a user
 * first touches the affected feature.
 */
export function assertProductionEnv(): void {
  if (process.env.SKIP_ENV_VALIDATION === 'true') return;

  const checked = createServerEnvSchema(true).safeParse(process.env);
  if (checked.success) return;

  console.error('❌ Invalid production environment:');
  console.error(
    JSON.stringify(z.flattenError(checked.error).fieldErrors, null, 2)
  );
  throw new Error(
    'Invalid production environment variables. Refusing to start.'
  );
}
