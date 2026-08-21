# Engineering Audit Report — Security, Performance, and Code Quality

- **Project:** IT Asset Management System (EITAMS)
- **Audit date:** 2026-08-18
- **Baseline:** `dev` @ `845a754` ("docs(audit): record navigation timing fixes")
- **Scope:** Application security, runtime performance, code quality, and engineering best practices
- **Prior audit:** [`AUDIT_REPORT_2026-07-14.md`](./AUDIT_REPORT_2026-07-14.md) — this report is an independent re-review, not a status update of that one.

## Executive summary

The codebase is in good shape structurally. Lint and TypeScript both pass clean, there are no N+1 query loops, no `dangerouslySetInnerHTML` sinks, only five `any` escapes in production source, and every `sql.raw` fragment is built from static internal column names rather than request input. The mobile pairing flow is genuinely well hardened — GlobalAdmin-only at issuance with an authoritative database backstop at claim time.

The material problems are concentrated in three places:

1. **Route Handlers authenticate but do not authorize.** Server Actions consistently go through `enforceActionAccess`/`enforceFormAccess` (48 call sites). Route Handlers do not. Two of them — `/api/v1/scan` and `/api/files` — check only that the caller is logged in, which exposes purchase costs, vendor details, invoice documents, and plaintext software license keys to any authenticated principal including `Employee`.
2. **A per-request 100,000-iteration PBKDF2 hash** guards the external API. The keys it protects are 32 random bytes, so the key stretching buys nothing and costs roughly 50–100 ms of blocking CPU on every external request.
3. **Migration `0006` indexes are invisible to Drizzle.** All 23 indexes are raw SQL absent from `schema.ts`, so the next `drizzle-kit generate` can emit `DROP INDEX` for them and silently revert the performance work.

One prior-audit item marked "Fixed" is **not present in the code**: there is no production-aware environment validation in `src/lib/env.ts` (SEC-C below).

### Findings by severity

| Severity | Count | IDs                                                                                  |
| -------- | ----- | ------------------------------------------------------------------------------------ |
| High     | 4     | SEC-A, SEC-B, PERF-A, CQ-A                                                           |
| Medium   | 12    | SEC-C, SEC-D, SEC-E, SEC-F, PERF-B, PERF-C, PERF-D, PERF-E, PERF-F, CQ-B, CQ-C, CQ-D |
| Low      | 6     | SEC-G, SEC-H, PERF-G, CQ-E, CQ-F, CQ-G                                               |

---

## Security

### SEC-A — High — `/api/v1/scan` performs no role authorization

**Evidence:** [src/app/api/v1/scan/route.ts:16](../src/app/api/v1/scan/route.ts#L16)

```ts
const user = await getAuthenticatedUserFromRequest(req);
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// ... no role check anywhere below
const assetDetails = await getAssetDetailsById(assetTag);
```

The handler establishes _authentication_ and then returns the complete asset detail payload. `getAssetDetailsById` returns `purchase.basePrice`, `purchase.tax`, `purchase.totalCost`, `purchase.invoiceUrl`, the full `vendor` record, and `softwareLicense.licenseKey` ([src/lib/data/asset-details-repo.ts:420](../src/lib/data/asset-details-repo.ts#L420)).

`getAuthenticatedUserFromRequest` falls back to the web session cookie when no `Authorization` header is present ([src/lib/auth/get-authenticated-user.ts:80-93](../src/lib/auth/get-authenticated-user.ts#L80-L93)), so this is reachable from an ordinary browser session. The edge proxy cannot help: its matcher excludes `/api` entirely ([src/proxy.ts:257](../src/proxy.ts#L257)).

**Impact:** Any `Employee` — the least privileged role, explicitly denied the asset registry, financials, and operations in `canAccessRoute` — can enumerate asset tags and read acquisition costs, vendor contacts, invoice URLs, and plaintext software license keys for every asset in the system.

**Fix:** Authorize by role, and strip financial and license fields for principals who are not entitled to them.

```ts
import { canViewAssetRegistry, canAccessFinancials } from '@/lib/auth/roles';

const user = await getAuthenticatedUserFromRequest(req);
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
if (!canViewAssetRegistry(user.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

const assetDetails = await getAssetDetailsById(assetTag);
if (!assetDetails)
  return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

// Financial and license detail is need-to-know even among privileged roles.
const payload = canAccessFinancials(user.role)
  ? assetDetails
  : {
      ...assetDetails,
      purchase: null,
      vendor: null,
      softwareLicense: assetDetails.softwareLicense
        ? { ...assetDetails.softwareLicense, licenseKey: null }
        : null,
    };

return NextResponse.json({
  success: true,
  message: 'Asset Scanned Successfully',
  data: payload,
});
```

Add a regression test asserting that an `Employee` principal receives 403 and that an `ITOperator` receives a payload with `purchase === null`.

---

### SEC-B — High — `/api/files` performs no object-level authorization

**Evidence:** [src/app/api/files/route.ts:15-27](../src/app/api/files/route.ts#L15-L27)

```ts
const user = await getAuthenticatedUserFromRequest(request);
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const pathname = request.nextUrl.searchParams.get('pathname');
if (
  !pathname ||
  pathname.includes('..') ||
  !SENSITIVE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
) {
  return NextResponse.json({ error: 'Invalid pathname' }, { status: 400 });
}
// streams the blob — no role check, no ownership check
```

The only gates are "logged in" and "path starts with `invoices/`, `warranties/`, `disposals/`, or `documents/`". There is no check that the caller's role may view financial or disposal documents, and no check that the requested pathname corresponds to a record the caller is entitled to see.

The randomized `folder/<uuid>-<name>` naming from `uploadFileToStorage` ([src/lib/storage.ts:48](../src/lib/storage.ts#L48)) makes the path hard to guess, but this is security-by-obscurity: these URLs are embedded in page payloads, browser history, referrer chains, and support tickets. Once a URL leaks to any authenticated user, it resolves.

**Impact:** Disposal certificates, purchase invoices, and warranty documents are readable by any authenticated principal who obtains a pathname, including `Employee`.

**Fix:** Resolve the pathname back to its owning record and authorize against that record.

```ts
import { eq, sql } from 'drizzle-orm';
import { assetDocuments, assetPurchases } from '@/db/schema';
import { canAccessFinancials, canViewDisposalHistory } from '@/lib/auth/roles';

const proxyUrl = `/api/files?pathname=${encodeURIComponent(pathname)}`;

const [document] = await db
  .select({ kind: sql<string>`'document'` })
  .from(assetDocuments)
  .where(eq(assetDocuments.fileUrl, proxyUrl))
  .limit(1);

const [invoice] = await db
  .select({ kind: sql<string>`'invoice'` })
  .from(assetPurchases)
  .where(eq(assetPurchases.invoiceUrl, proxyUrl))
  .limit(1);

const record = document ?? invoice;
if (!record) return new NextResponse('Not found', { status: 404 });

const permitted =
  record.kind === 'invoice'
    ? canAccessFinancials(user.role)
    : canViewDisposalHistory(user.role) || canAccessFinancials(user.role);

if (!permitted)
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
```

Prefer this over a pure role check: a role check alone still lets an entitled user fetch arbitrary blobs by path, which defeats retention and deletion guarantees.

---

### SEC-C — Medium — No production-aware environment validation

**Evidence:** [src/lib/env.ts:42-61](../src/lib/env.ts#L42-L61)

`ENCRYPTION_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `PRIVATE_BLOB_READ_WRITE_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY` are all declared `.optional()`. The schema contains no `superRefine`, and the only reference to `'production'` in the file is the `NODE_ENV` enum member itself.

The prior audit records SEC-11 as **Fixed** — "Production-aware secret length, encryption-key, HTTPS URL, and dependent-service validation is enforced." That validation is not in the current source. Either it regressed or the claim was never accurate.

**Impact:** Each missing variable fails at first use in production rather than at boot:

| Missing variable                | Runtime failure                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENCRYPTION_SECRET`             | `getKey()` throws — Keycloak token storage and webhook secret decryption break ([src/lib/crypto.ts:13](../src/lib/crypto.ts#L13))                         |
| `UPSTASH_REDIS_REST_*`          | `Redis.fromEnv()` throws — **all external API rate limiting silently unavailable** ([src/lib/api/rate-limiter.ts:10](../src/lib/api/rate-limiter.ts#L10)) |
| `PRIVATE_BLOB_READ_WRITE_TOKEN` | Every sensitive upload throws ([src/lib/storage.ts:53](../src/lib/storage.ts#L53))                                                                        |
| `QSTASH_*_SIGNING_KEY`          | Cron returns 500; scheduled alerts stop firing ([src/app/api/qstash/cron/route.ts:40](../src/app/api/qstash/cron/route.ts#L40))                           |

The rate-limiting case is the dangerous one — a misconfigured deploy removes a security control without any startup signal.

**Fix:** Fail fast at boot. `src/lib/env.ts` is imported by `next.config.ts`, so this runs at build and server start.

```ts
const serverEnvSchema = z
  .object({/* ...existing fields... */})
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

    const requiredInProduction = [
      'ENCRYPTION_SECRET',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'PRIVATE_BLOB_READ_WRITE_TOKEN',
      'QSTASH_CURRENT_SIGNING_KEY',
      'QSTASH_NEXT_SIGNING_KEY',
    ] as const;

    for (const key of requiredInProduction) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when NODE_ENV=production`,
        });
      }
    }

    for (const key of ['NEXTAUTH_URL', 'KEYCLOAK_ISSUER'] as const) {
      if (!env[key].startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must use HTTPS in production`,
        });
      }
    }
  });
```

Add a test asserting the schema rejects a production environment missing each variable. Note `vitest.config.ts` currently excludes `src/lib/env.test.ts` from the run — do not place the new test at that path.

---

### SEC-D — Medium — Software license keys are stored in plaintext

**Evidence:** [src/db/schema.ts](../src/db/schema.ts) — `softwareLicenses.licenseKey` is `varchar('license_key', { length: 255 })` with no encryption at write or read time.

The application already has a correct AES-256-GCM implementation with random 12-byte IVs and authentication tags ([src/lib/crypto.ts](../src/lib/crypto.ts)), and applies it to Keycloak access/ID/refresh tokens and webhook secrets. License keys were left out.

**Impact:** A database backup, a read-replica credential, or an over-broad query exposes redistributable license keys directly. Compounded by SEC-A, which serves them over HTTP to any authenticated user.

**Fix:** Encrypt at rest with the existing helpers, with a read path that tolerates legacy plaintext during migration — the same pattern already used for Keycloak tokens.

```ts
// src/lib/master-data/license-key.ts
import { encrypt, decrypt } from '@/lib/crypto';

const ENCRYPTED_PATTERN = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[a-f0-9]+$/;

export function encryptLicenseKey(plain: string | null): string | null {
  return plain ? encrypt(plain) : null;
}

/** Reads both encrypted and legacy-plaintext rows so the backfill can run online. */
export function decryptLicenseKey(stored: string | null): string | null {
  if (!stored) return null;
  if (!ENCRYPTED_PATTERN.test(stored)) return stored; // legacy plaintext
  try {
    return decrypt(stored);
  } catch {
    return null;
  }
}
```

Then: widen the column to `text` (ciphertext exceeds 255 characters), write through `encryptLicenseKey` in `src/actions/software.ts`, read through `decryptLicenseKey`, backfill existing rows in a one-shot script, and mask the value in the UI behind an explicit reveal that writes an audit entry.

---

### SEC-E — Medium — No rate limiting on any internal, mobile, or auth route

**Evidence:** All 29 handlers under `src/app/api/v1/`, `src/app/api/files/`, and `src/app/api/auth/` contain zero references to `applyRateLimit`, `applyPreAuthRateLimit`, or `Ratelimit`. Throttling exists only inside the `withApiKey` wrapper, which covers the six `/api/v1/external/*` routes.

Unprotected endpoints that warrant it:

- `/api/auth/mobile-exchange` — QR pairing token claim, unauthenticated by design
- `/api/auth/check-qr-status` — polled by the browser during pairing
- `/api/v1/search` — three concurrent trigram scans per call
- `/api/files` — unbounded blob egress and bandwidth cost
- `/api/v1/scan` — full asset detail read per call

**Impact:** Any authenticated user can drive unbounded database and storage load. The pairing endpoints are reachable pre-authentication.

**Fix:** Add a wrapper mirroring `withApiKey`, keyed by principal where available and IP otherwise.

```ts
// src/lib/api/with-rate-limit.ts
import { NextResponse, type NextRequest } from 'next/server';
import { applyRateLimit, injectRateLimitHeaders } from '@/lib/api/rate-limiter';

export function withRateLimit<T extends unknown[]>(
  bucket: string,
  handler: (req: NextRequest, ...rest: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...rest: T) => {
    const forwarded =
      req.headers.get('x-vercel-forwarded-for') ??
      req.headers.get('x-forwarded-for');
    const ip =
      forwarded?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const result = await applyRateLimit(`${bucket}:${ip}`);
    if (!result.success) {
      const response = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
      return injectRateLimitHeaders(response, result);
    }

    return injectRateLimitHeaders(await handler(req, ...rest), result);
  };
}
```

Apply tight buckets to the pairing endpoints (~10/min per IP) and looser ones to authenticated reads. Prefer the trusted `x-vercel-forwarded-for` header first, matching the existing logic in `withApiKey`.

---

### SEC-F — Medium — Webhook dispatch has no destination allowlist (SSRF)

**Evidence:** [src/lib/webhooks/dispatcher.ts](../src/lib/webhooks/dispatcher.ts) — `qstash.publishJSON({ url: subscription.url, ... })` publishes to whatever URL was stored on the subscription. There is no scheme check, no host allowlist, and no private-range rejection at either subscription time or dispatch time.

QStash mediates the actual egress, which means requests do not originate from the application's own network position — a meaningful compensating control, and the reason this is Medium rather than High. It does not prevent an operator-supplied destination from being used to exfiltrate event payloads containing asset, financial, and user data.

**Fix:** Validate at both write and dispatch.

```ts
// src/lib/webhooks/validate-destination.ts
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
]);
const BLOCKED_RANGES = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i,
];

export function assertAllowedWebhookDestination(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:')
    throw new Error('Webhook destination must use HTTPS');
  if (BLOCKED_HOSTNAMES.has(url.hostname))
    throw new Error('Webhook destination is not routable');
  if (BLOCKED_RANGES.some((range) => range.test(url.hostname))) {
    throw new Error('Webhook destination targets a private network range');
  }

  const allowlist = serverEnv.WEBHOOK_ALLOWED_HOSTS?.split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  if (allowlist?.length && !allowlist.includes(url.hostname)) {
    throw new Error(
      `Webhook destination ${url.hostname} is not on the configured allowlist`
    );
  }

  return url;
}
```

Add `WEBHOOK_ALLOWED_HOSTS` as an optional env var, call the guard when a subscription is created or updated, and call it again inside `dispatchWebhookEvent` so rows written before the guard existed cannot be used.

---

### SEC-G — Low — Production CSP allows `'unsafe-inline'` scripts

**Evidence:** [next.config.ts:11-13](../next.config.ts#L11-L13)

```ts
const scriptSource = isProduction
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
```

`'unsafe-inline'` in `script-src` removes essentially all XSS mitigation the policy would otherwise provide. The rest of the header set is good — `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, HSTS with preload in production.

Exploitability today is low: there are zero `dangerouslySetInnerHTML` occurrences in the codebase and React escapes by default. This is defense-in-depth that is currently switched off.

**Fix:** Move to a nonce-based policy. Generate a nonce per request in `src/proxy.ts`, forward it on a request header, and emit the CSP there instead of statically in `next.config.ts`.

```ts
// in proxy(), before returning NextResponse.next()
const nonce = crypto.randomUUID().replace(/-/g, '');
const requestHeaders = new Headers(request.headers);
requestHeaders.set('x-nonce', nonce);

const response = NextResponse.next({ request: { headers: requestHeaders } });
response.headers.set(
  'Content-Security-Policy',
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'", // Tailwind requires inline styles
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
);
return response;
```

Roll this out behind `Content-Security-Policy-Report-Only` first and watch for violations before enforcing — Next.js streaming and the Serwist service worker both inject scripts that need the nonce threaded through.

---

### SEC-H — Low — Extension-suffixed paths bypass the auth gate

**Evidence:** [src/proxy.ts:86](../src/proxy.ts#L86)

```ts
function isPublicAssetPath(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    /* ... */
    /\.[a-z0-9]+$/i.test(pathname) // ← any path ending in a dot-extension
  );
}
```

`isProtectedRoute` is false for any path matching that regex, so authentication, the account-disabled gate, and the RBAC check in `canAccessRoute` are all skipped.

No current app route ends in an extension, so this is not exploitable today. It is a latent bypass: the first time someone adds a route like `/reports/export.csv`, it silently becomes world-readable.

**Fix:** Match a known static-file extension allowlist rather than any extension.

```ts
const STATIC_FILE_EXTENSIONS =
  /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|txt|xml|webmanifest)$/i;

function isPublicAssetPath(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json' ||
    STATIC_FILE_EXTENSIONS.test(pathname)
  );
}
```

---

## Performance

### PERF-A — High — 100,000 PBKDF2 iterations on every external API request

**Evidence:** [src/lib/api/api-key-hash.ts:6-21](../src/lib/api/api-key-hash.ts#L6-L21), called at [src/lib/api/with-api-key.ts:83](../src/lib/api/with-api-key.ts#L83)

```ts
const API_KEY_HASH_ITERATIONS = 100_000;
const API_KEY_HASH_SALT = 'eitams-api-key-hash-v1'; // static, committed to the repo
```

Key stretching exists to make brute force expensive against **low-entropy** secrets. These keys are not low entropy — they are generated as `randomBytes(32)` ([src/actions/integrations.ts:120](../src/actions/integrations.ts#L120)), or 256 bits. Brute-forcing that is infeasible regardless of hash cost, so all 100,000 iterations are pure overhead. The salt compounds this: it is a hardcoded constant in a source file, so it is not secret and provides no protection beyond what a bare SHA-256 would give.

**Impact:** Roughly 50–100 ms of blocking CPU per external API request, on the critical path before any work is done. This is also a self-inflicted DoS amplifier — the pre-auth limiter permits 20 requests per window per IP, and every one of those 20 burns the full PBKDF2 cost even when the key is invalid.

**Fix:** Use HMAC-SHA256 with a server-side pepper. Single hash, constant-time, and the pepper (unlike the committed salt) is a real secret that defeats offline rainbow tables against a stolen database.

```ts
// src/lib/api/api-key-hash.ts
import { createHmac } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/**
 * API keys are 32 random bytes (256 bits), so key stretching adds no security —
 * only a pepper matters, to keep a stolen key_hash column useless offline.
 */
export function hashApiKey(plainTextKey: string): string {
  const pepper = serverEnv.API_KEY_PEPPER;
  if (!pepper) throw new Error('API_KEY_PEPPER is not configured');
  return createHmac('sha256', pepper).update(plainTextKey).digest('hex');
}
```

Migration path, since existing hashes cannot be recomputed from stored data:

1. Add `API_KEY_PEPPER` to `serverEnv` (required in production, per SEC-C).
2. Add a `hash_version smallint not null default 1` column to `api_keys`.
3. Keep the PBKDF2 function as `hashApiKeyV1` and have `withApiKey` try the v2 HMAC first, then fall back to v1 only if the v2 lookup misses.
4. On a successful v1 match, rewrite that row to v2 and set `hash_version = 2`.
5. Once no `hash_version = 1` rows remain, delete the PBKDF2 path.

`hashApiKey` currently returns a `Promise`; the HMAC version is synchronous. Keep the `async` signature during the transition so no call site changes.

---

### PERF-B — Medium — A database write on every authenticated mobile request

**Evidence:** [src/lib/auth/get-authenticated-user.ts:69-72](../src/lib/auth/get-authenticated-user.ts#L69-L72)

```ts
await db
  .update(linkedDevices)
  .set({ lastActiveAt: new Date() })
  .where(eq(linkedDevices.id, device.id));
```

Every authenticated mobile request performs two `SELECT`s and then an awaited `UPDATE` before the handler runs. `lastActiveAt` is a presence indicator displayed on the devices settings page — second-level precision has no product value.

**Impact:** Three round trips of auth overhead per mobile API call, one of them a write that takes a row lock and generates WAL. On a device polling notifications, this is a continuous write stream that buys nothing.

**Fix:** Throttle to a coarse interval. The repository already established this pattern for assignment overdue refreshes in `dc5d8e8`, and `src/lib/ttl-cache.ts` exists for exactly this.

```ts
import { ttlCache } from '@/lib/ttl-cache';

const DEVICE_ACTIVITY_THROTTLE_MS = 5 * 60 * 1000;

// Only one write per device per 5 minutes, and never on the critical path.
if (!ttlCache.has(`device-activity:${device.id}`)) {
  ttlCache.set(
    `device-activity:${device.id}`,
    true,
    DEVICE_ACTIVITY_THROTTLE_MS
  );
  void db
    .update(linkedDevices)
    .set({ lastActiveAt: new Date() })
    .where(eq(linkedDevices.id, device.id))
    .catch((error) => {
      console.error('[auth] Failed to record device activity:', error);
    });
}
```

Verify `ttlCache`'s exact API before wiring this up; if it is per-worker only, that is still correct here — worst case is one redundant write per worker per interval.

---

### PERF-C — Medium — Two awaited database writes per external API request

**Evidence:** [src/lib/api/with-api-key.ts:113-129](../src/lib/api/with-api-key.ts#L113-L129)

```ts
await Promise.all([
  db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, found.id)),
  logAuditAction({ entityType: 'ExternalApi' /* ... */ }),
]);

const response = await handler(req, { ...ctx, apiKey: found });
```

Both writes are awaited **before** the handler executes, so they sit on the latency path of every external request. Combined with PERF-A, an external API call pays ~100 ms of PBKDF2 plus two serialized writes before any business logic starts.

**Impact:** Added latency on every external API call, plus write amplification on `api_keys` — a hot row per integration, updated on every request.

**Fix:** Throttle `lastUsedAt` the same way as PERF-B, and keep the audit write but stop blocking the handler on it.

```ts
if (!ttlCache.has(`api-key-used:${found.id}`)) {
  ttlCache.set(`api-key-used:${found.id}`, true, 60_000);
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, found.id))
    .catch((error) => console.error('[api] lastUsedAt update failed:', error));
}

// Start the audit write, run the handler concurrently, settle before responding
// so the record is durable but does not serialize ahead of the work.
const auditWrite = logAuditAction({
  entityType: 'ExternalApi',
  entityId: req.nextUrl.pathname,
  actionType: 'EXTERNAL_API_ACCESS',
  performedById: found.createdById,
  newData: { apiKeyName: found.name, scope: requiredScope, method: req.method },
});

const [response] = await Promise.all([
  handler(req, { ...ctx, apiKey: found }),
  auditWrite,
]);
```

Keep the audit write awaited before the response is returned — the prior audit deliberately made external API audit writes fail-closed, and that property should not be traded away for latency.

---

### PERF-D — Medium — `/api/v1/profile` re-queries data it already has

**Evidence:** [src/app/api/v1/profile/route.ts](../src/app/api/v1/profile/route.ts)

`getAuthenticatedMobileUserFromRequest` already selects `id`, `name`, `email`, `role`, and `isActive` from `users` and returns them. The handler then issues a second `SELECT` against `users` for four of those same five columns.

**Impact:** A wholly redundant database round trip on every profile fetch. Minor in isolation; it is listed because the fix is a two-line deletion.

**Fix:**

```ts
export async function GET(req: Request) {
  const user = await getAuthenticatedMobileUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, name, email, role } = user;
  return NextResponse.json({ data: { id, name, email, role } });
}
```

Destructure explicitly rather than returning `user` directly — the authenticated object also carries `deviceId` and `jwtId`, which should not be serialized to the client.

---

### PERF-E — Medium — Pusher client constructed on every request

**Evidence:** [src/app/api/v1/inject-barcode/route.ts](../src/app/api/v1/inject-barcode/route.ts)

```ts
export async function POST(req: Request) {
  // ...
  const pusher = new Pusher({ appId: /* ... */ });
  await pusher.trigger(`user-${userId}`, 'barcode_scanned', { barcode });
}
```

A new client — and its underlying HTTP agent and connection pool — is allocated per request. This is the tethered-scanner hot path, where a user scans barcodes in rapid succession.

**Fix:** Hoist to a module-level singleton, matching how `rate-limiter.ts` memoizes its `Ratelimit` instances.

```ts
let pusherClient: Pusher | null = null;

function getPusherClient(): Pusher {
  if (!pusherClient) {
    pusherClient = new Pusher({
      appId: serverEnv.PUSHER_APP_ID!,
      key: clientEnv.NEXT_PUBLIC_PUSHER_KEY!,
      secret: serverEnv.PUSHER_SECRET!,
      cluster: clientEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return pusherClient;
}
```

While here: the non-null assertions on `PUSHER_APP_ID` and `PUSHER_SECRET` paper over the fact that both are `.optional()` in `serverEnv`. Fold them into the SEC-C production requirement list and drop the assertions.

---

### PERF-F — Medium — Bulk-import file limit exceeds the Server Action body limit

**Evidence:** [src/lib/bulk-import/parse-file.ts:32-35](../src/lib/bulk-import/parse-file.ts#L32-L35) vs [next.config.ts:39](../next.config.ts#L39)

```ts
// parse-file.ts — advertises 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
if (file.size > MAX_FILE_SIZE) {
  throw new Error('File exceeds the maximum limit of 10MB.');
}
```

```ts
// next.config.ts — transport caps at 5 MB
serverActions: { bodySizeLimit: '5mb', allowedOrigins: serverActionOrigins },
```

`parseFile` is called from `src/actions/bulk-import.ts:132`, a Server Action. Any upload between 5 MB and 10 MB is rejected by the framework before the action body executes, so the validation never runs and the user never sees the "10MB" message.

**Impact:** Users uploading 5–10 MB spreadsheets get an opaque framework error rather than an actionable one. The stated limit is a limit the system cannot honor.

**Fix:** Make one number authoritative and enforce it before upload. Export the limit from a shared constant, validate client-side in the dropzone, and set the server-side ceiling below the transport cap:

```ts
// src/lib/constants.ts
export const MAX_IMPORT_FILE_BYTES = 4.5 * 1024 * 1024; // under the 5 MB Server Action cap
```

Then reference `MAX_IMPORT_FILE_BYTES` in `parse-file.ts`, in the react-dropzone `maxSize` prop, and in the user-facing copy. If 10 MB imports are a genuine requirement, the file must bypass Server Actions entirely — upload directly to Blob storage from the client and pass only the resulting pathname to the action.

---

### PERF-G — Low — `cacheComponents: true` alongside `unstable_cache`

**Evidence:** [next.config.ts:35](../next.config.ts#L35) enables `cacheComponents: true`. The data layer still uses `unstable_cache` at four call sites (`src/actions/dashboard/queries/inventory.ts`, `.../kpis.ts`, `src/lib/currency-server.ts`), there are no `'use cache'` directives anywhere in `src`, and no route declares `export const dynamic` or `export const revalidate`.

Next.js 16 Cache Components is a different caching model from `unstable_cache`. Running both without any explicit route-level cache declarations makes the effective caching behavior of the dashboard queries hard to reason about, and it is not obvious from the code which layer is actually serving a cached value.

**Fix:** Pick one model deliberately. If Cache Components is intended, migrate the four call sites:

```ts
export async function getInventoryStatus() {
  'use cache';
  cacheLife('minutes');
  cacheTag('inventory-status');
  // ...query
}
```

If it is not intended, remove `cacheComponents: true` and keep `unstable_cache`. Either way, confirm the outcome by measuring — hit each dashboard route twice and check whether the second request issues database queries.

---

## Code quality and best practices

### CQ-A — High — Migration `0006` indexes are not declared in `schema.ts`

**Evidence:** [src/db/migrations-archive/0006_security_performance_indexes.sql](../src/db/migrations-archive/0006_security_performance_indexes.sql) creates 23 indexes plus the `pg_trgm` extension. `src/db/schema.ts` declares 33 indexes, and **none** of them are the ones from `0006` — `system_audit_logs_performed_at_id_idx`, `assets_asset_tag_trgm_idx`, `asset_assignments_active_user_idx`, and the rest are absent.

`systemAuditLogs` in particular is declared with no index configuration at all, despite being the table that migration `0006` gave three indexes.

**Impact:** Drizzle treats these indexes as drift. The next `drizzle-kit generate` will compare the schema file against the database, see indexes it does not know about, and can emit `DROP INDEX` statements for them. `db:push` is an exposed script in `package.json` and would apply that directly. The entire PERF-01 remediation from the prior audit is one routine schema change away from being silently reverted — and CI would not catch it, because CI migrates from zero using the checked-in SQL, which still contains `0006`.

**Fix:** Declare every index from `0006` in the schema file so the model is the single source of truth.

```ts
export const systemAuditLogs = pgTable(
  'system_audit_logs',
  {/* ...existing columns... */},
  (table) => ({
    performedAtIdIdx: index('system_audit_logs_performed_at_id_idx').on(
      table.performedAt.desc(),
      table.id.desc()
    ),
    entityTimelineIdx: index('system_audit_logs_entity_timeline_idx').on(
      table.entityType,
      table.entityId,
      table.performedAt.desc()
    ),
    actorTimelineIdx: index('system_audit_logs_actor_timeline_idx').on(
      table.performedById,
      table.performedAt.desc()
    ),
  })
);
```

For the five GIN trigram indexes, use Drizzle's `.using()` form as already done for `webhook_subscriptions_events_gin_idx`:

```ts
assetTagTrgmIdx: index('assets_asset_tag_trgm_idx').using(
  'gin',
  sql`${table.assetTag} gin_trgm_ops`
),
```

Verification step, and the important one: after declaring them, run `npx drizzle-kit generate` and confirm it produces **no** new migration. A generated `DROP INDEX` means a name or definition does not match. Add that check to CI so drift fails the build:

```yaml
- name: Verify schema matches migrations
  run: |
    npx drizzle-kit generate
    git diff --exit-code src/db/migrations
```

The partial index (`asset_assignments_active_user_idx`, which carries a `WHERE returned_date IS NULL` clause) and the `CREATE EXTENSION` statement may not be fully expressible in the schema DSL. Keep those in raw SQL and add a comment in `schema.ts` recording that they are intentionally unmanaged.

---

### CQ-B — Medium — Coverage thresholds sit at roughly half the measured baseline

**Evidence:** [vitest.config.ts](../vitest.config.ts) sets `statements: 25, branches: 20, functions: 20, lines: 25`. The prior audit measured actual coverage at 47.02% statements, 38.44% branches, 42.16% functions, and 48.03% lines.

**Impact:** Coverage can fall by roughly 22 percentage points before CI objects. The gate currently ratchets nothing.

**Fix:** Raise the floors to just under the measured baseline, then add stronger per-directory floors for the modules where the findings in this report live.

```ts
thresholds: {
  statements: 45,
  branches: 36,
  functions: 40,
  lines: 46,

  // Security-critical paths carry their own floors.
  'src/lib/auth/**': { statements: 80, branches: 70, functions: 80, lines: 80 },
  'src/lib/api/**': { statements: 75, branches: 65, functions: 75, lines: 75 },
  'src/app/api/**': { statements: 60, branches: 50, functions: 60, lines: 60 },
},
```

Re-measure with `npm run test:coverage` before committing these numbers — the baseline figures come from the prior audit, not from this run, and they may have shifted.

---

### CQ-C — Medium — Two functions of roughly 470 and 510 lines

**Evidence:** [src/actions/master-data.ts](../src/actions/master-data.ts) is 1,650 lines with 5 exported functions. `createMasterDataRecord` spans lines 667–1138 (~471 lines) and `updateMasterDataRecord` spans 1138–1650 (~512 lines).

Both are dispatch functions that branch on an entity-type discriminator and inline the full validation, persistence, and audit logic for every master-data entity in a single body.

**Impact:** Untestable in isolation, hard to review, and a merge-conflict magnet. This is the concrete instance of the prior audit's CQ-04, which remains open.

**Fix:** Replace the branching with a handler registry, one module per entity.

```ts
// src/actions/master-data/handlers/index.ts
type MasterDataHandler = {
  schema: z.ZodTypeAny;
  create(input: unknown, user: AuthenticatedUser): Promise<MasterDataResult>;
  update(
    id: number,
    input: unknown,
    user: AuthenticatedUser
  ): Promise<MasterDataResult>;
};

export const MASTER_DATA_HANDLERS = {
  brand: brandHandler,
  category: categoryHandler,
  vendor: vendorHandler,
  location: locationHandler,
  department: departmentHandler,
} satisfies Record<string, MasterDataHandler>;
```

`createMasterDataRecord` then reduces to auth, discriminator resolution, and delegation — roughly 30 lines. Move each entity's logic across one at a time, adding a focused test file per handler as you go; the existing `master-data.test.ts` should stay green throughout as a safety net.

---

### CQ-D — Medium — Route Handlers hand-roll the auth boundary

**Evidence:** Server Actions use `enforceActionAccess`/`enforceFormAccess` at 48 call sites and are consistent. Route Handlers each re-implement the boundary: `getAuthenticatedUserFromRequest` or `getAuthenticatedMobileUserFromRequest`, a manual null check, and then a role check that is present in some handlers (`/api/v1/search`, `/api/auth/generate-qr`) and absent in others (`/api/v1/scan`, `/api/files`, `/api/v1/activity/recent`).

This is the direct structural cause of SEC-A and SEC-B. The prior audit raised it as CQ-07 and it remains open for the Route Handler surface.

**Fix:** Give Route Handlers the same wrapper treatment `withApiKey` already gives external routes.

```ts
// src/lib/api/with-auth.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';
import type { AuthenticatedUser, UserRole } from '@/types/auth';

/**
 * Every route handler states its authorization requirement explicitly.
 * Pass `() => true` for deliberately open-to-all-authenticated routes —
 * making that a conscious, greppable decision rather than an omission.
 */
export function withAuth<TContext extends Record<string, unknown>>(
  predicate: (role: UserRole) => boolean,
  handler: (
    req: NextRequest,
    ctx: TContext & { user: AuthenticatedUser }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: TContext) => {
    const user = await getAuthenticatedUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!predicate(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(req, { ...ctx, user });
  };
}
```

Usage: `export const POST = withAuth(canViewAssetRegistry, async (req, { user }) => { ... })`.

Once every handler is converted, add a lint rule or a test that asserts no file under `src/app/api/` calls `getAuthenticatedUserFromRequest` directly, so the next handler cannot forget.

---

### CQ-E — Low — `next.config.ts` mixes ESM imports with `module.exports`

**Evidence:** [next.config.ts](../next.config.ts) opens with `import './src/lib/env';` and closes with `module.exports = nextConfig;`.

This works today — verified against the built config snapshot in `.next/required-server-files.json`, which correctly carries `output: 'standalone'`, `reactStrictMode: true`, and `serverActions.bodySizeLimit: '5mb'`. It is a CJS/ESM hybrid that survives because Next.js transpiles the config, and it will break if the file ever gains a top-level `await` or is loaded through a stricter ESM path.

**Fix:** `export default nextConfig;`. Also add the `NextConfig` type, which the current JSDoc comment gestures at but does not apply:

```ts
import type { NextConfig } from 'next';
import './src/lib/env';

const nextConfig: NextConfig = {/* ... */};

export default nextConfig;
```

Typing the object would have surfaced whether `reactCompiler` and `cacheComponents` belong at the top level or under `experimental` for this Next version.

---

### CQ-F — Low — 27 `console.log` calls in production source

**Evidence:** 27 occurrences across non-test, non-seed source. Notably [src/app/api/v1/scan/route.ts:22](../src/app/api/v1/scan/route.ts#L22) logs a user ID and role on every scan, and `src/app/api/qstash/cron/route.ts` logs unconditionally on each cron invocation.

The project already has a structured logging module — `src/lib/latency.ts` exports `logLatency` and `logError`, gated behind `ENABLE_RUNTIME_LOGS`. These `console.log` calls bypass it, so they cannot be switched off in production and emit user identifiers into whatever collects stdout.

**Fix:** Route them through the existing helpers and drop the identifier:

```ts
logLatency({ scope: 'API', label: '/api/v1/scan', startTime: requestTimer });
```

Then add `no-console` to `eslint.config.mjs` with an allowance for `console.error` and `console.warn`, and an override permitting everything under `src/db/seed*.ts` and `scripts/`.

---

### CQ-G — Low — Container base images are not pinned by digest

**Evidence:** [Dockerfile](../Dockerfile) uses `FROM node:22-alpine` in both the builder and runner stages.

Tag-based references are mutable, so two builds of the same commit can produce different images. The rest of the supply chain is handled well — GitHub Actions are pinned to full SHAs in all three workflows, and `npm ci` with a committed lockfile gives deterministic dependencies.

**Fix:** Pin by digest and let Dependabot update them.

```dockerfile
FROM node:22-alpine@sha256:<digest> AS builder
FROM node:22-alpine@sha256:<digest> AS runner
```

Resolve the current digest with `docker buildx imagetools inspect node:22-alpine`. Add a `docker` entry to `.github/dependabot.yml` so the pins receive security updates rather than going stale.

---

## Verification performed during this audit

| Check                                     | Result                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run check` (ESLint + `tsc --noEmit`) | **Passed**, exit code 0, no warnings                                                          |
| N+1 query scan (awaited queries in loops) | **Clean** — no `await db.`/`await tx.` inside `for`, `while`, or async `map`                  |
| XSS sink scan                             | **Clean** — zero `dangerouslySetInnerHTML` occurrences                                        |
| SQL injection review of `sql.raw`         | **Clean** — 2 call sites, both fed static column-name strings from `src/lib/depreciation.ts`  |
| Type-safety escapes                       | 5 `any` in production source, 17 `eslint-disable`, 9 `@ts-ignore`/`@ts-expect-error`          |
| Secret exposure in version control        | **Clean** — `.env`, `.env.test` untracked; `.dockerignore` excludes `.env*`, `*.pem`, `*.key` |
| Built config snapshot                     | Config loads correctly despite CQ-E                                                           |
| API route auth coverage                   | 35 route files reviewed individually; 2 authorization gaps found (SEC-A, SEC-B)               |

Not performed: no test suite run, no production build, no live database, no deployed-environment testing, and no penetration testing. The coverage figures cited in CQ-B come from the prior audit, not from a run during this one.

## Positive controls observed

- Mobile pairing is properly hardened: GlobalAdmin-only at `generate-qr`, atomic Redis `GETDEL` at claim, and an authoritative database re-check of role and active state in `mobile-exchange` before any JWT is minted.
- Mobile JWT validation is centralized and checks issuer, audience, subject, JTI, device ownership, device revocation, and active user state.
- `getAuthenticatedUser` is wrapped in React `cache`, so multiple protected loaders on one server-rendered page share a single user row read.
- AES-256-GCM with random 12-byte IVs and authentication tags; webhook HMAC verification uses `timingSafeEqual`.
- File uploads validate extension, MIME type, magic bytes, and size, and write to randomized paths in a private blob store.
- Database pool has explicit size, connect, idle, and statement timeouts, plus an idle-error listener that prevents worker termination.
- Migration `0006` index coverage is genuinely well chosen — composite, partial, and trigram indexes matched to the actual query shapes.
- CI enforces deterministic install, migration-from-zero, formatting, lint, typecheck, coverage, production build, and a high-severity dependency audit, with all actions pinned to full SHAs.

## Suggested remediation sequence

**First — authorization gaps, highest risk per unit of effort**

1. SEC-A — add the role check to `/api/v1/scan` (single file)
2. SEC-B — add object-level authorization to `/api/files`
3. CQ-D — introduce `withAuth` and convert every route handler, so the class of bug cannot recur

**Second — silent-failure and silent-regression risks**

4. CQ-A — declare the `0006` indexes in `schema.ts` and add the drift check to CI
5. SEC-C — add production environment validation
6. PERF-A — migrate API key hashing to peppered HMAC with the versioned column

**Third — correctness and load**

7. PERF-F — reconcile the import file-size limits
8. SEC-E — apply `withRateLimit` to internal and pairing routes
9. PERF-B, PERF-C, PERF-D, PERF-E — remove per-request writes and redundant work

**Fourth — hardening and hygiene**

10. SEC-D — encrypt license keys at rest
11. SEC-F — webhook destination allowlist
12. SEC-G — nonce-based CSP, behind report-only first
13. SEC-H, CQ-B, CQ-C, CQ-E, CQ-F, CQ-G, PERF-G

Items 1, 2, 5, 7, and the PERF-B/C/D/E group are each contained enough to land as individual commits. CQ-A and PERF-A both need a verification step against a real database before they can be considered done.

---

# Addendum — Remediation log and new findings

Added 2026-08-18, after the audit above. Findings discovered _while implementing_ the
remediation are recorded here as `NEW-n` rather than folded into the original numbering,
so the original audit stays a faithful record of the baseline.

## Remediation log

| ID    | Status | Implementation notes                                                                                                                                                                                      |
| ----- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-A | Fixed  | `/api/v1/scan` now requires `canViewAssetRegistry` and redacts purchase, vendor, and license-key fields for non-financial roles via the new `redactAssetDetailsForRole` helper. 8 regression tests added. |
| SEC-B | Fixed  | `/api/files` resolves the pathname to an owning record before streaming and applies a per-kind policy. Unreferenced pathnames now 404 instead of streaming. 10 regression tests added.                    |

## New findings

### NEW-1 — Medium — The financial-data boundary contradicts itself between the roles model and the asset panel

**Discovered while implementing:** SEC-B.

`canAccessFinancials` grants financial entitlement to GlobalAdmin and FinancialAuditor only, and
the edge proxy blocks `ITOperator` from `/financials` outright. But the asset details panel is
gated by `canViewAssetRegistry` — which _includes_ `ITOperator` — and it renders
`purchase.totalCost`, the full vendor record, and the invoice download link
(`asset-details-panel-wrapper.tsx:404`).

So the same financial data an ITOperator is denied at the route level is served to them inside the
asset panel. This is not a new regression; it is the existing behavior. It is recorded because it
forced a deliberate deviation from the fix originally proposed for SEC-B: gating `/api/files`
invoices on `canAccessFinancials`, as the audit suggested, would have **broken ITOperator's working
invoice access**. The implemented policy uses `canViewAssetRegistry` for invoices to preserve that
behavior, which means SEC-B closes the Employee and arbitrary-pathname holes but does not resolve
this inconsistency.

**Impact:** The intent of the permission model is ambiguous. Either ITOperator is meant to see
acquisition costs (in which case `canAccessFinancials` is misnamed and the proxy's `/financials`
block is arbitrary), or the asset panel is over-sharing and has been since it was written.

**Fix:** This needs a product decision before a code change — it is the one item in this report that
cannot be resolved by engineering judgement alone. Once decided:

- _If ITOperator should not see financials:_ redact `purchase` and `vendor` in
  `getAssetDetailsPanelData` for non-financial roles (reusing `redactAssetDetailsForRole`), and
  tighten `canReadDocumentKind`'s `invoice` case to `canAccessFinancials`. The scan route already
  behaves this way, so the two surfaces would converge.
- _If ITOperator should see financials:_ rename the predicate to something like
  `canAccessFinancialLedgers` to make clear it gates the ledger pages rather than financial data as
  a class, and document that acquisition cost is registry-level data.

Until it is decided, the scan route (strict) and the asset panel (permissive) disagree. That
divergence is deliberate and documented here rather than silently reconciled in one direction.

### NEW-2 — Low — `assetDisposals.disposalReceiptUrl` is a dead column exposed in the external API

**Discovered while implementing:** SEC-B.

Disposal certificates are written to `assetDocuments` with `documentType: 'disposal-certificate'`
(`src/actions/disposals/execute.ts:240-252`). Nothing in the codebase ever writes
`assetDisposals.disposalReceiptUrl` — it is only read, and one of those readers is the public
external API:

```ts
// src/app/api/v1/external/disposals/route.ts:85
disposalReceiptUrl: assetDisposals.disposalReceiptUrl,
```

**Impact:** Every external API consumer receives `disposalReceiptUrl: null` for every disposal, with
no indication that receipts exist elsewhere. Integrators building against the documented contract
will conclude disposals have no receipts.

**Fix:** Decide whether the column is retired or restored.

- _Retire it:_ drop the field from the external API response (a breaking contract change, so version
  it or announce it), then drop the column in a migration once no rows hold data.
- _Restore it:_ populate it in `execute.ts` alongside the `assetDocuments` insert — but note it is a
  single `varchar(500)` while the flow accepts multiple receipts, so it can only ever hold the first.
  Serving the `assetDocuments` rows for that asset is the more honest fix.

The SEC-B resolver deliberately still checks this column so that any pre-existing rows holding a
value continue to authorize correctly.

### NEW-3 — Medium — `/api/auth/unlink-device` trusted the session cookie instead of the database

**Discovered while implementing:** CQ-D.

The handler called `getServerSession(authOptions)` directly and then authorized from
`session.user.role`:

```ts
const session = await getServerSession(authOptions);
const user = session?.user;
// ...
if (device.userId !== user.id && user.role !== 'GlobalAdmin') {
```

Every other authenticated surface goes through `getAuthenticatedUser`, which re-reads the row and
rejects `isActive === false`. This route did neither, so it authorized from a JWT claim rather than
the authoritative record.

**Impact:** A user deactivated after their session cookie was issued could still unlink devices until
the cookie expired, and the `GlobalAdmin` check trusted a claim minted at sign-in rather than the
current stored role. This is the same class of gap the prior audit's SEC-01 set out to close; this
route was missed.

**Fix (applied):** Converted to `withSessionAuth(allowAnyRole, ...)`, which resolves the principal
through `getAuthenticatedUser` — database-backed, active-checked, authoritative role — and switched
the inline comparison to the `isGlobalAdmin` predicate. Ownership is still enforced per object, so
a non-admin may only unlink their own device.

### NEW-4 — Medium — `/api/v1/issues` allowed any authenticated user to disable any asset

**Discovered while implementing:** CQ-D.

The handler authenticated and then, with no role check, ran a transaction that set the target asset
to `In Repair`, created a maintenance ticket, and **terminated every active assignment on that
asset** by stamping `returnedDate`.

**Impact:** Any authenticated principal — including `Employee` — could pass an arbitrary `assetId`
and force that asset out of service, silently ending its assignment history. Repeated across asset
IDs this is a denial-of-service against the registry with permanent data effects on assignment
records. It also accepts any `assetId`, not just assets belonging to the caller.

**Fix (applied):** Gated on `canManageAssets` via `withAuth`. The endpoint has no in-repo consumer —
employee issue reporting goes through the `reportDefectiveFromPanel` server action, and mobile
pairing is GlobalAdmin-only — so no working flow depended on the previous behavior.

**Residual:** The handler still trusts an arbitrary `assetId` from the request body without checking
that the asset is assigned to, or otherwise related to, the caller. That is acceptable now that the
endpoint is restricted to asset managers, but a per-asset ownership check would be appropriate if
the endpoint is ever opened to employees.

### NEW-5 — Critical — Nine tables the application uses are created by no migration

**Discovered while implementing:** CQ-A.

Declaring the `0006` indexes in `schema.ts` required running `drizzle-kit generate`. It cannot run:

```
Error: Interactive prompts require a TTY terminal
    at promptNamedWithSchemasConflict (drizzle-kit/bin.cjs)
    at tablesResolver (drizzle-kit/bin.cjs)
```

Drizzle is prompting about **tables**, not indexes. Comparing `schema.ts` against the migration
history explains why — `schema.ts` declares 28 tables, the latest snapshot knows 20, and **nine
tables are created by no migration SQL at all**:

| Table                   | What it holds                                                             |
| ----------------------- | ------------------------------------------------------------------------- |
| `api_keys`              | External API authentication — every `/api/v1/external/*` request reads it |
| `linked_devices`        | Mobile pairing and revocation — every mobile request reads and writes it  |
| `user_refresh_tokens`   | Encrypted Keycloak refresh tokens                                         |
| `webhook_subscriptions` | Integration destinations and HMAC secrets                                 |
| `notification_queue`    | Escalation and reminder scheduling                                        |
| `app_notifications`     | In-app notification feed                                                  |
| `notification_rules`    | Alert configuration (the settings page writes here)                       |
| `notification_logs`     | Delivery audit trail                                                      |
| `integration_settings`  | Teams/email integration configuration                                     |

Separately, `sessions` is created by migration `0000` but no longer exists in `schema.ts`.

Verification used:

```bash
grep -l 'CREATE TABLE.*"api_keys"' src/db/migrations/*.sql   # no match
```

**Impact — release blocking.** `npm run db:migrate` against an empty database produces a schema the
application cannot run on. Authentication for the external API, the entire mobile companion app, the
notification engine, and integrations would all fail at the first query. The live environments work
only because their schema was created with `drizzle-kit push` (which writes `schema.ts` directly to
the database and records nothing), so the migration history has silently diverged from reality.

CI does not catch this. The "Apply migrations from zero" step only executes SQL; nothing compares the
resulting database to `schema.ts`. This also means the prior audit's CICD-02 ("CI migrates a clean
PostgreSQL database") verified less than it appeared to.

**Fix.** This needs a real database to do safely, which was not available in this environment
(Docker daemon not running), so it is documented rather than attempted. The procedure:

1. Start a scratch PostgreSQL: `npm run test:db:up`.
2. Temporarily re-declare the legacy `sessions` table in `schema.ts` so the create/delete pair
   disappears and `drizzle-kit generate` stops asking whether any new table is a rename of it. This
   is the only reason the command needs a TTY.
3. Run `npx drizzle-kit generate --name=reconcile_untracked_tables` in an interactive terminal.
4. Edit the generated SQL so every statement is idempotent — `CREATE TABLE IF NOT EXISTS`,
   `CREATE TYPE ... ` guarded by a `DO $$ ... EXCEPTION WHEN duplicate_object` block. Existing
   environments already have these objects, so the migration must be a no-op there.
5. Apply from zero against the scratch database, then diff the result against a `db:push` of
   `schema.ts` into a second scratch database. They must match.
6. Decide `sessions` separately: leaving it is harmless, dropping it is destructive and needs its own
   reviewed migration. Do not fold it into this one.
7. Only then remove entries from `KNOWN_MISSING_FROM_MIGRATIONS` in
   `src/db/schema-migration-drift.test.ts`.

**Guard added now.** `src/db/schema-migration-drift.test.ts` pins the exact set of drifted tables, so
a tenth one cannot be introduced silently, and asserts that every index in migration `0006` is
declared in `schema.ts`.

**CI addition to make once NEW-5 is closed** — the drift check the audit originally proposed for
CQ-A cannot be added until `drizzle-kit generate` runs cleanly:

```yaml
- name: Verify schema matches migrations
  run: |
    npx drizzle-kit generate
    git diff --exit-code src/db/migrations
```

**Correction to CQ-A above.** The original write-up said the next `drizzle-kit generate` could emit
`DROP INDEX` for the undeclared indexes. That is not the mechanism: `generate` diffs the previous
snapshot against `schema.ts`, and since neither contained those indexes it would not have dropped
them. The real exposure is `drizzle-kit push` (`npm run db:push`), which diffs `schema.ts` against
the **live database** and drops objects it does not recognize. The remediation is unchanged, and it
is now applied.

## Implementation notes and deviations

### SEC-C — enforcement moved from build time to server boot

The audit proposed a `superRefine` on the schema parsed at import. Implemented as written, this
**broke `npm run build`**: `next build` runs with `NODE_ENV=production` and loads `next.config.ts`,
which imports `src/lib/env.ts` — so the build demanded runtime credentials it has no use for. The
first build attempt failed on `PRIVATE_BLOB_READ_WRITE_TOKEN`.

`process.env.NEXT_PHASE` is not yet set when `next.config.ts` is evaluated, so it cannot be used to
detect the build from inside the env module.

Final shape: shape and format validation stays at import time (so a malformed value still fails the
build), and the production service requirements moved into `assertProductionEnv()`, called from a new
`src/instrumentation.ts`. Next.js runs `register()` once per server boot, which is the correct moment
— a deploy missing Redis credentials now fails to start rather than silently losing rate limiting.
`SKIP_ENV_VALIDATION=true` provides an escape hatch. Verified: `npm run build` passes.

### PERF-A — SHA-256 rather than the proposed peppered HMAC

The audit recommended HMAC-SHA256 with a server-side pepper and a `hash_version` column. Implemented
differently, for two reasons:

1. **The pepper earns nothing here.** A pepper protects a stolen hash column from offline brute
   force. These keys are `randomBytes(32)` — 256 bits — so they are not brute forcible from a SHA-256
   digest regardless. Adding a pepper would introduce a new production-required secret (another way
   for a deploy to fail) in exchange for no practical gain. Fast hashing of high-entropy tokens is
   the standard approach for API keys, as distinct from user-chosen passwords.
2. **The `hash_version` column is not available.** `api_keys` is one of the nine tables NEW-5 shows
   are absent from the migration history, so no column can be added through the normal path.

Migration is instead done in place and needs no schema change: `withApiKey` looks up the SHA-256
hash, and on a miss falls back to the PBKDF2 hash and rewrites the row on success. Both digests are
64 hex characters, so the existing `varchar(64)` column holds either.

**Residual:** while `API_KEY_LEGACY_HASH_FALLBACK` is `true`, an _invalid_ key still costs one PBKDF2
pass, so the denial-of-service amplification the audit described is reduced but not eliminated — the
pre-auth limiter (20 requests per window per IP) remains the control. Valid keys pay it at most once.
Set the flag to `false` once every key has been used or rotated to remove the amplifier entirely; the
flag is documented in `.env.example`.

### NEW-6 — Medium — The software license key is stored twice, once in a searchable plaintext column

**Discovered while implementing:** SEC-D.

Software assets write the license key into **two** columns from a single input:

```ts
// src/actions/assets.ts:295 — and identically at
// src/app/api/v1/external/assets/route.ts:243
if (input.pillar === 'Software') {
  await tx.insert(softwareLicenses).values({
    licenseKey: input.serialNumber || null,
    ...
```

`input.serialNumber` has already been written to `assets.serial_number`. So the license key exists as:

1. `software_licenses.license_key` — the column SEC-D proposed encrypting, and
2. `assets.serial_number` — plaintext, and carrying the `assets_serial_number_trgm_idx` GIN index
   added by migration `0006` so that omni-search can match on it.

**Why SEC-D was not implemented as written.** Encrypting only `license_key` would leave the identical
secret readable in `assets.serial_number`, and additionally exposed through omni-search
(`/api/v1/search` matches `serial_number` with `ILIKE '%q%'`) and every asset registry payload. The
result would be a system that _appears_ to encrypt license keys while still serving them in the
clear — worse than the current state, because it invites false confidence.

**Impact:** unchanged from SEC-D — license keys are readable from a database backup or an over-broad
query — but the remediation is larger than a single column.

**Fix — needs a decision first.** The question is whether a software asset's "serial number" is a
searchable identifier or a secret. It is currently being used as both.

- _If the license key is a secret:_ stop copying it into `assets.serial_number` for the `Software`
  pillar (leave it null, or store a non-secret instance identifier), encrypt
  `software_licenses.license_key` using the existing `encrypt`/`decrypt` helpers with the
  legacy-plaintext read path sketched in SEC-D, and backfill. Software assets then become
  unsearchable by key, which is the correct outcome for a secret. Note this also requires a
  decision on `assets_serial_number_trgm_idx`.
- _If it is an identifier:_ the field is not a credential, SEC-D should be closed as "won't fix", and
  the UI should stop labelling it a license key.

**Additional constraint.** Whichever path is chosen, `license_key` is `varchar(255)`. AES-256-GCM
ciphertext in this codebase's format is roughly `2n + 42` characters, so the column only holds
plaintext up to about 106 characters. Widening it to `text` requires a migration, which is currently
blocked by NEW-5.

**Partial mitigation already in place:** SEC-A's `redactAssetDetailsForRole` strips `licenseKey` from
the `/api/v1/scan` response for non-financial roles.

### CQ-B — the auth coverage floor is lower than the audit proposed

The audit suggested `src/lib/auth/**` at 80% statements. Measured, that directory is at **31.3%**, so
that floor would have failed the build immediately. Per-directory floors are set at the measured
level instead:

| Path                                                   | statements | branches | functions | lines |
| ------------------------------------------------------ | ---------- | -------- | --------- | ----- |
| global                                                 | 46         | 37       | 41        | 47    |
| `src/lib/api/**` (measured 84.6 / 72.0 / 88.5 / 84.1)  | 80         | 68       | 85        | 80    |
| `src/lib/auth/**` (measured 31.3 / 29.0 / 45.5 / 32.1) | 30         | 26       | 42        | 30    |

A floor that fails on the day it lands gets deleted, not satisfied. These pin the current level so
coverage can only go up; raise the auth numbers as tests are added. The gap itself is worth
tracking — authentication is the least covered code in the repository relative to its risk.

## Items not implemented, and why

| ID                    | Reason                                                                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-D                 | Blocked on a design decision — see NEW-6. Encrypting `license_key` alone would be false assurance while the same secret sits in plaintext in the searchable `assets.serial_number`.                                                                           |
| CQ-A (migration half) | Blocked on NEW-5. The index declarations are done; generating the reconciling migration requires `drizzle-kit generate`, which cannot currently run.                                                                                                          |
| NEW-5                 | Requires a live PostgreSQL to author and verify a 9-table reconciliation migration. The Docker daemon was not running in this environment. Hand-writing that DDL unverified would risk diverging further from the live schema.                                |
| SEC-G (enforcement)   | The report-only policy is in place. Enforcing it needs a browser to confirm Next.js streaming and the Serwist service worker tolerate the nonce.                                                                                                              |
| PERF-G                | Determining whether `unstable_cache` or Cache Components actually serves each dashboard query needs runtime measurement against a real database — hit each route twice and observe whether queries are issued. No code change was made on a guess.            |
| CQ-C                  | The `master-data.ts` handler-registry refactor is a pure-quality change with no security or correctness impact, and touches two ~500-line functions. Deferred rather than rushed alongside security work — the same reasoning the prior audit gave for CQ-04. |

## Verification after remediation

Run at the end of the remediation pass, on the full working tree:

| Gate                                      | Result                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run check` (ESLint + `tsc --noEmit`) | **Passed** — no errors, no warnings                                                      |
| `npm run format:check`                    | **Passed**                                                                               |
| `vitest run`                              | **Passed** — 211 files, 1204 tests (from 203 files, 1125 tests at the start of the pass) |
| `vitest run --coverage`                   | **Passed** — 47.95 / 39.24 / 43.32 / 48.98, all global and per-directory thresholds met  |
| `npm run build`                           | **Passed** — Next.js production build, exit 0                                            |

Not run: the Playwright end-to-end suite and any migration against a real database, both of which
require services unavailable in this environment. NEW-5 in particular means `npm run db:migrate`
against an empty database is known to produce an incomplete schema and must not be treated as
verified.

## NEW-5 resolved — 2026-08-19

CI proved the finding. `npm run db:migrate` failed on a clean PostgreSQL, taking
both the quality job and the Playwright job down with it:

```
> drizzle-kit migrate
[⣷] applying migrations...
Error: Process completed with exit code 1
```

The immediate cause is migration `0002`, which deduplicates `notification_queue`
and adds a unique index to it. That table is one of the nine created by no
migration, so from an empty database the statement hit a relation that did not
exist. Every migration run from zero had been failing; the prior audit's
CICD-02 ("CI migrates a clean PostgreSQL database") was never true.

**What was done.** `drizzle-kit generate` produced the reconciliation once the
create/delete ambiguity was removed — the legacy `sessions` table is now
declared in `schema.ts`, since it exists in every deployed database and the
model should describe reality rather than a create/rename prompt drizzle cannot
resolve without a TTY. The generated migration showed the drift was wider than
nine tables: six enums, a `Returned` value on `asset_status`, and columns
including `asset_assignments.state`, `asset_purchases.exchange_rate` and
`software_licenses.asset_id` were also absent from the history. All of it
confirms these databases were built with `drizzle-kit push`.

Migration `0007` therefore creates 9 tables, 6 enums, 42 indexes and 17
constraints, and every statement is idempotent — `CREATE TABLE IF NOT EXISTS`,
`ADD COLUMN IF NOT EXISTS`, `ADD VALUE IF NOT EXISTS`, and `DO $$ … EXCEPTION
WHEN duplicate_object` around enum and constraint creation. An environment that
was pushed to skips all of it; a database built from zero gets it.

Migration `0002` is now guarded on `to_regclass('public.notification_queue')`
and returns early when the table is absent, which is the case at that point in a
from-zero run. `0007` creates the table with that unique index already in place,
so nothing is lost. Editing an applied migration is safe here because drizzle
applies by journal order rather than re-verifying old file hashes, and on a
pushed database `0002` had already run.

**Deliberately excluded.** The generated migration contained one destructive
statement, `ALTER TABLE "users" DROP COLUMN "password"`, because `schema.ts`
stopped declaring the column when the app moved to Keycloak. It was removed.
The column is unused but may still hold data, and dropping it belongs in its own
reviewed migration with a backup — not folded into a CI fix.

**Verification.** Structural validation only: balanced `DO` blocks, balanced
quotes and parentheses, zero destructive statements, and `schema-migration-drift.test.ts`
now asserting empty allowlists in both directions. Docker was unavailable, so
**this has not been applied to a real PostgreSQL locally** — the CI `db:migrate`
step against `postgres:17-alpine` is the verification, and its result should be
checked before this is treated as closed.

## NEW-5 reopened, then closed by squashing the migration chain — 2026-08-19

The `0007` reconciliation above was not enough, and the reason matters more than
the fix: it was signed off on structural validation instead of being run. CI
failed again on the next push, at a different statement.

The visible output was misleading. The only thing printed was the `NOTICE` the
new guard in `0002` raises, followed by `exit code 1`:

```
[⣯] applying migrations...{
  severity: 'NOTICE',
  message: 'notification_queue does not exist yet; migration 0007 creates it with this index.',
}
[⣯] applying migrations...
Error: Process completed with exit code 1
```

That `NOTICE` is the guard working. drizzle-kit swallows the actual error behind
its spinner, so the failing statement never appears. Driving the migrator
directly and printing `error.cause` produced it:

```
Failed query: CREATE EXTENSION IF NOT EXISTS "pg_trgm"; …
cause: PostgresError: column "asset_id" does not exist
```

Migration `0006` builds `software_licenses_asset_id_idx` on
`software_licenses.asset_id`. No migration adds that column until `0007` — one
file too late. `CREATE INDEX IF NOT EXISTS` guards the index name, not the
column, so the guard that made `0002` safe could never have helped here.

This is the same defect as `0002`, not a new one: the migration history was
written against a schema `drizzle-kit push` had already moved on from, so
several files reference objects that arrive later or never. Fixing them one at a
time is whack-a-mole, and each round costs a CI cycle to discover.

### What was done

The chain is squashed to a single baseline generated from `schema.ts`, which is
the only artifact that describes the schema correctly.

- `src/db/migrations/0000_baseline_schema.sql` — 29 tables, 15 enums, 54
  indexes, 38 foreign keys. Every statement idempotent: `IF NOT EXISTS` on all
  83 `CREATE TABLE`/`CREATE INDEX` statements, and a `DO $$ … EXCEPTION WHEN
duplicate_object` wrapper on each of the 53 enum and constraint statements,
  which have no `IF NOT EXISTS` form. Nothing is dropped.
- `CREATE EXTENSION IF NOT EXISTS "pg_trgm"` is prepended by hand. drizzle-kit
  does not manage extensions, so it emits the five `gin_trgm_ops` indexes
  without the extension they require. This was previously supplied by `0006` and
  would have been lost silently in any regenerated baseline — there is now a
  test for it.
- A short reconciliation block sits after the tables and **before** the foreign
  keys, adding the three columns and the enum value that `0007` introduced. It
  only matters for a database built by the old migrate-only chain, where the
  tables already exist and so are skipped by `CREATE TABLE IF NOT EXISTS`. The
  ordering is load-bearing and was found by testing, not by reading: placed at
  the end of the file, the run failed with `column "asset_id" referenced in
foreign key constraint does not exist` — the original bug, reintroduced.
- Migrations `0000`–`0007` moved to `src/db/migrations-archive/`, out of the
  journal. They are kept for reference; nothing reads them.

The journal timestamp of the baseline is newer than the archived `0007`, so a
database that already applied the old chain still picks the baseline up and
no-ops through it.

### Verification

A disposable PostgreSQL 18 cluster (`initdb` on port 54322 — Docker was still
unavailable, but the server binaries were installed locally). Four scenarios:

| Scenario                                                                        | Result             |
| ------------------------------------------------------------------------------- | ------------------ |
| Empty database                                                                  | `MIGRATED OK`      |
| Objects present, `__drizzle_migrations` cleared — a `push`-provisioned database | `MIGRATED OK`      |
| Database built by archived `0000`–`0005`, then the baseline                     | `MIGRATED OK`      |
| `drizzle-kit migrate` from zero vs `drizzle-kit push` from `schema.ts`          | **byte-identical** |

The last row is the strongest of the four. Dumping every column, index,
constraint and enum label from both databases and diffing gives 725 identical
lines, which means the baseline reproduces `schema.ts` exactly rather than
approximately.

The legacy-lineage database differs from the fresh one by exactly one column,
`users.password`, which the old chain created and `schema.ts` no longer
declares. That is the column deliberately not dropped, so the difference is
expected.

CI now applies the migrations twice, clearing `__drizzle_migrations` in between,
so the idempotency the squash depends on is checked on every run against a real
database rather than asserted in a comment.

### The Playwright job

Two defects, one shared with the above.

`e2e/global-setup.ts` runs `npm run db:migrate`, so the migration failure took
the e2e job down as well; that is fixed by the baseline. Behind it sat a second
failure that only appeared once the migration succeeded:

```
Error: Cannot find module '@/types/master-data'
   at ..\src\db\schema.ts:23
```

`tsconfig.json` lists `playwright.config.ts` in `exclude`. Playwright resolves
`paths` from the tsconfig covering its config file, finds none, and every `@/…`
import in setup or a spec fails. `tsconfig: './tsconfig.json'` in the Playwright
config states it explicitly.

Global setup also no longer imports the application's `db` module. It opens a
`postgres` connection directly and closes it in a `finally`: two rows of fixture
data do not need the ORM, and the app module both drags in the path aliases
above and opens a pool with no exposed way to close it — an open handle in the
runner process for the rest of the run.

**On the 30-minute cancellation: not reproduced, and not explained.** Locally the
job now runs to completion and exits. Two guards were added so the same symptom
cannot recur silently rather than because the cause is known: `globalTimeout` of
20 minutes, under the job's 30-minute cap, so a wedged run fails with a report
and uploaded artifacts instead of being killed with nothing; and `stdout`/
`stderr` piped from the dev server, which otherwise fails to boot invisibly. The
HTML reporter was ruled out by reading Playwright 1.61's source — `onExit`
returns immediately when `CI` is set, so it never serves the report and blocks.
If the job stalls again, the report and trace will now survive it.

## Dependency audit gate — 2026-08-20

The migration, test and build steps all passed; the job failed on its last step,
`npm audit --audit-level=high`, with 16 advisories (9 high, 1 critical).

Unlike the mobile repository — where the same gate could never pass, because
every advisory arrived through the Expo SDK and `expo` is a production
dependency — **every advisory here had a semver-compatible fix**. So this one is
fixed rather than gated.

### Dependencies removed

Three of the vulnerable subtrees existed only to support packages nothing
imports. They were removed before touching versions, since a dependency that is
not there needs no patching:

| Removed                        | Why                                                                                                                                                                                                                                                | Subtree it pulled in                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `react-email`                  | Emails are hand-written HTML template strings sent through Resend in `src/app/api/qstash/email/route.ts`. No `@react-email/*` import exists anywhere.                                                                                              | `socket.io`, `socket.io-parser` (high) |
| `@serwist/next`, `serwist`     | The PWA was never wired up: no service worker file, no `withSerwist` in `next.config.ts`. The only mention in source was a comment in `src/proxy.ts` claiming the Serwist service worker injects scripts — it does not, because it does not exist. | —                                      |
| `eslint-config-prettier`       | Not referenced in `eslint.config.mjs`, so it disables nothing.                                                                                                                                                                                     | —                                      |
| `eslint-plugin-unused-imports` | Not referenced in `eslint.config.mjs`, so it lints nothing.                                                                                                                                                                                        | —                                      |

`@types/ws` moved from `dependencies` to `devDependencies`. It is types-only and
`output: 'standalone'` bundles runtime dependencies into the image.

Removing these took the count from 13 to 11.

**Kept**, despite looking removable: `bufferutil` and `utf-8-validate` are
optional native accelerators that `ws` loads at runtime by name, and `ws`
carries the Neon driver's WebSocket pool in production — nothing imports them
because nothing is supposed to. The `@types/*` packages, `@vitest/ui`,
`dotenv-cli` and `babel-plugin-react-compiler` are reached through tooling
rather than imports.

`shadcn` was removed and then restored. It reads as a CLI — nothing imports it
and no npm script runs it — but `src/app/globals.css` line 3 is
`@import 'shadcn/tailwind.css'`, so it is a real build input and the production
build fails without it: `Can't resolve 'shadcn/tailwind.css'`. The import scan
had it right; it was overruled by reasoning about what the package looked like,
and only the build caught that. It carries `@modelcontextprotocol/sdk`, `hono`,
`@hono/node-server`, `vite` and `undici` behind it, all of which stay — the
high-severity `undici` advisory in that subtree is resolved by the version bumps
below rather than by removal.

### Versions raised

`npm audit fix`, without `--force`, so every change is within the declared
semver range:

| Package                | From    | To      |
| ---------------------- | ------- | ------- |
| `next`                 | 16.2.10 | 16.3.1  |
| `next-auth`            | 4.24.14 | 4.24.15 |
| `sharp`                | 0.34.5  | 0.35.3  |
| `undici`               | 6.27.0  | 6.28.0  |
| `nanoid`               | 3.3.12  | 3.3.18  |
| `brace-expansion`      | 1.1.15  | 1.1.18  |
| `js-yaml`              | 4.3.0   | 4.3.1   |
| `@tailwindcss/postcss` | 4.3.2   | 4.3.3   |

The Next minor bump required one source change: `instantNavigationDevToolsToggle`
was dropped from `ExperimentalConfig` in 16.3 with no replacement, and `tsc`
failed on it. It only controlled the dev overlay, so it was removed.

`npm audit --audit-level=high` now exits 0. Four moderate advisories remain, all
of them `postcss` reached through `next`, `vite` and `@tailwindcss/postcss`;
npm offers no non-breaking fix for them and the gate does not cover moderate.
They are visible on every run rather than suppressed.

### One e2e test added

`e2e/tests/rbac.spec.ts` asserts the role boundary end to end: an Employee
session is accepted at `/` (which redirects to `/my-assets`, since employees
have no dashboard) and refused at `/financials`, landing on `/403`.

The test asserts the outcome rather than either mechanism, and the reason is
worth recording because the first two drafts were wrong.

The initial version targeted `/settings` and was documented as covering the edge
RBAC gate in `src/proxy.ts`. Mutation testing killed that claim: with
`canAccessRoute` forced to return `true` for Employees, the test still passed,
because `/settings` redirects into `settings/master-data`, which repeats the
role check itself.

The second version moved to `/financials` on the belief that only one of the
seventeen pages under `(management)` had a guard of its own. That was an
artefact of grepping `page.tsx` and nothing else: `financials/layout.tsx` guards
its whole subtree, and ten more routes call `requireRole` from
`src/lib/auth/page-guard.ts`. **Every route under `(management)` has both the
edge gate and a second check.** That is a positive finding, and it corrects the
claim made earlier in this section's first draft.

Which means no route exists where an e2e test could isolate the edge gate, so
the test does not pretend to. It was falsified by removing both layers together
— the run then ends on `/financials/depreciation` and the assertion fails with
`Expected pattern: /\/403$/`.

The control half is load-bearing: a redirect away from `/financials` proves
nothing by itself, because an unrecognised session cookie produces the same
shape of failure.

## Reported bug fixes — 2026-08-20

Twenty issues reported from using the app. Three findings are worth recording
separately from the fixes themselves, because they change what the reports meant.

### A defect nobody reported

**Assigning an asset to a location left it pending forever.** Both
`assignSingleAsset` and `assignMultipleAssets` hardcoded
`state: 'pending approval'` regardless of target, but acceptance matches on
`assignedToUserId === currentUser.id` — and a location has nobody who can
accept. Every location assignment ever made was still sitting in the pending
queue, inflating pending counts and the reminder list.

`initialAssignmentState()` now derives the state from the target. Migration
`0001` moves the rows that were already stuck. Verified against a real database:
a stuck location row became `assigned` while a genuinely pending user assignment
was left alone.

### Two reports were partly wrong, in the reporter's favour

**"Update depreciated value on refresh."** The ledger already recomputed on
every request; nothing was cached. The real defect was that
`fetch-depreciation-ledger.ts` and `fetch-tco-overview.ts` each re-implemented
straight-line depreciation by hand, with a **36-month** default life and
30.4-day months, while `lib/depreciation.ts`, `actions/financials.ts` and the
disposal executor used **60** and whole calendar months. The same asset reported
a different book value depending on which screen you opened. All callers now go
through `calculateCurrentBookValue`.

**"Assign model if no change, refresh no need."** There is no change-model
flow — the model is immutable after registration (`asset-edit.ts` excludes it,
and the edit panel renders it as a `LockedField`). The real fault was in the
device-model form's dirty check: `handleModelImageSelection` set
`removeExistingImage = true` even when the file picker was **cancelled**, and
nothing ever reset it. Opening and dismissing the picker left the form
permanently dirty, so Save stayed enabled and a no-op save triggered a full
route refresh.

### Symptoms that shared one cause

- **"Pending approval" wording** — the assignments grid printed the raw database
  enum with a CSS `capitalize`. Fixed with a display map
  (`src/lib/assignments/labels.ts`); the stored value is untouched, since it is
  embedded in every historical audit row and exposed by the public
  `/api/v1/assets/my-assets` contract.
- **Rejections missing from asset history** — they were logged all along, under
  `entityType: 'asset_assignment'`, while `getAssetAuditHistory` filtered on
  `'Asset'`. Widening the query surfaced accepts, declines, cancellations and
  returns at once, rather than double-writing rows for rejection alone.
- **Disposal documents on every row** — `asset_documents` had no link to a
  disposal, so an asset disposed more than once showed every receipt it had ever
  accumulated on all of its rows. Added `disposal_id`, backfilled only where an
  asset has exactly one disposal record, and left genuinely ambiguous rows null
  rather than guessing.
- **Four sentence builders for audit text** — the dashboard feed, the audit log
  table, the asset history timeline and the mobile activity endpoint each had
  their own, and the dashboard's inflected verbs by inspecting the last letter.
  Consolidated into `src/lib/audit-events.ts`, which also picked up the better
  `formatAuditValue` and the order-insensitive `areValuesEqual` that only the
  audit table had.

### Also found while fixing

- `cron/route.ts` sent two notification types to `/portal/my-assets?...`, **a
  route that does not exist** — those notifications 404'd on click. All
  notification destinations now come from `src/lib/notifications/target-urls.ts`.
- The 403 page's "Contact IT Support" button had **no `onClick` and no `href`**;
  the sidebar's Support button navigated to the dashboard. There was no support
  address anywhere in the codebase, and five pages each invented their own
  wording. `SUPPORT_EMAIL` / `SUPPORT_URL` in `src/lib/constants.ts` now back all
  seven sites — **both values are placeholders and must be set before release.**
- `BADGE_DICTIONARY` had no entries for the `excellent`, `fair` or `poor`
  conditions, so those rendered grey with a question-mark icon across the
  Furniture and Electronics views. The Electronics-specific colour map was keyed
  on derived status words rather than the condition enum, so any asset with a
  condition recorded fell through to the default.
- Every asset silently received a 5-year lifespan: `usefulLifeMonths` was read
  straight off `formData`, outside the Zod schema, with a hardcoded `'60'`, and
  no form field ever set it. It is now a validated Expected Lifespan field,
  defaulted to 5 years and editable afterwards.

### Verification

Lint, typecheck, formatting, 1252 unit tests and a production build all pass.
The migration was applied to a real PostgreSQL 18 from zero, re-applied over a
populated database with `__drizzle_migrations` cleared, and checked against a
fixture that exercises both data migrations and both of their no-op cases.

Not verifiable in CI, and worth a manual pass: the thermal and A4 asset tags
with a long model name, the Electronics and Furniture condition badges, an asset
disposed twice, and the Operations → Available assets detail image.

## Runtime errors and latency — 2026-08-21

### The Cache Components warnings were fallout from the Next upgrade

`src/app/(app-shell)/layout.tsx` already carried `export const unstable_instant
= false`. **Next 16.3 renamed that export to `instant`**, and an unrecognised
segment export is ignored rather than rejected — so the opt-out silently stopped
applying the moment the dependency audit moved 16.2.10 → 16.3.1, and every
navigation started reporting "uncached data during prerendering".

Renamed, and added to `src/app/page.tsx`, which exists only to `redirect()` and
so has nothing to prerender.

### The login page is now static

`/login` read `redirectTo` through `await searchParams`, which made the whole
route dynamic. The value is only ever handed to `signIn()` on click, so it is
read on the client with `useSearchParams()` instead and the page prerenders —
`○ /login` in the build output, where it was previously server-rendered on every
request. `sanitizeRedirectPath` is pure and does the same filtering it did on
the server; there are now tests for the off-site and `/login`-loop cases.

### The 17-second session call

`refreshAccessToken` opens a database transaction, takes a `pg_advisory_xact_lock`
for the user, and then calls Keycloak **from inside that transaction** — with no
timeout. Every other worker refreshing the same user blocks behind that lock for
however long the identity provider takes, and a transaction stays open the whole
time.

The lock is deliberate (Keycloak rotates refresh tokens, so concurrent refreshes
would revoke each other) and has been left alone. What was missing is a bound:
the call now carries an 8-second `AbortSignal.timeout`, so a slow provider fails
fast and frees the lock instead of stalling the session path.

### Where the rest of the latency actually is

Measured against the dev database rather than guessed:

|                                      |             |
| ------------------------------------ | ----------- |
| First query (connect + Neon wake)    | **1185 ms** |
| Steady-state round trip (`SELECT 1`) | **~125 ms** |

The database is Neon in `ap-southeast-1`. **Every sequential query costs ~125ms
before it does any work**, and the first after an idle period costs a second on
top. A page issuing five queries in sequence spends over half a second waiting
on the network no matter how well each one is written. That is the dominant term
in the 2-second dashboard render, and it is infrastructure, not application code.

The lever that matters is therefore the number of _sequential_ round trips, not
the cost of each query.

`getNotificationSummary` (509–826 ms) is fixed on that basis. It computed the
unread badge with `count(*) FILTER (...) OVER ()`, a window aggregate that must
see every notification the user has ever received before `LIMIT` can apply —
measured on 20k rows: 456 buffers and a top-N sort to return ten. It is now a
page query and a count **issued in parallel**, so it is still one round trip's
worth of latency while the page half became a 3-buffer index scan.

**An index that did not survive measurement.** The first attempt at this added
`app_notifications (user_id, created_at DESC)` on the theory that the page query
needed it. Explained across three scenarios — one user, forty users, and a user
whose notifications are all old — the planner chose an existing index every
time. It was removed rather than shipped: an index the planner never picks is
write amplification on every insert for no read benefit.

`getAuthenticatedUser` was already wrapped in React `cache()`, so it costs one
round trip per request regardless of how many loaders call it. No change needed.

### Migration applied to the dev database

`0001` had not been run there, which is why the disposals page crashed with
`column asset_documents.disposal_id does not exist` — the code was correct and
the schema was behind.

Applied, and the backfill rule improved first. Matching on "the asset's only
disposal" was too strict: the one real certificate in the database belonged to an
asset that had been **rejected once and then disposed properly**, so it had two
records and was skipped. Since a certificate is only ever written by the
execute-disposal action, which runs on completion, the Completed record is
provably its owner. The rule now matches on that, still refusing to guess when
an asset has two Completed disposals.

Verified on the dev data: `DES-001` now shows the certificate against disposal
20 (Completed) and nothing against disposal 19 (Rejected) — which is exactly the
reported "document shows in all rows".

## Streaming and connection reuse — 2026-08-21

### Every page inside the app shell now streams

The asset registry pages awaited their data before returning any markup, so a
navigation painted nothing until the slowest query finished — and with Cache
Components enabled Next reported it as "uncached data during prerendering" on
every visit.

`instant = false` on the shell layout does **not** suppress this for the pages
beneath it, and it would not be the right fix anyway: it makes the route block,
which is the behaviour being complained about.

A shared `loading.tsx` was not enough either. It gives a navigation something to
show, but Next validates the boundary per route, so a page whose own default
export is `async` still reports the error — which is why the registry pages went
quiet after being wrapped individually while every other route did not.

The fix is applied per page. Each `async` page is now split into a synchronous
default export and an inner `…Content` component that does the awaiting:

```tsx
async function AuditLogPageContent() {
  /* session + queries */
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AuditLogPageContent />
    </Suspense>
  );
}
```

Nineteen pages in total. The five redirect-only routes — `/financials`,
`/reports`, `/settings`, `/operations` and `/assets/[assetId]` — get
`export const instant = false` instead: they render no markup, so there is
nothing to stream and blocking is the honest answer.

`PageSkeleton` is deliberately one generic component rather than nineteen
bespoke ones, which would drift out of step with the pages they stand for. The
asset registry and dashboard keep their own, because their shape genuinely
differs.

Verified by rendering **all 24 sidebar routes** against the running dev server
with a real session cookie: every one returned 200, with **zero** prerender
errors and zero errors of any kind in the server log.

### The database round trip is the budget, and connections are the cost

Measured against the deployed Neon instance in `ap-southeast-1`:

|                                                |             |
| ---------------------------------------------- | ----------- |
| Query on an established connection             | **~130 ms** |
| Four concurrent queries, cold pool             | **1234 ms** |
| The same four, warm pool                       | **136 ms**  |
| The same four, run sequentially on a warm pool | **990 ms**  |

Two things follow, and they point in opposite directions from the obvious
guesses.

**`Promise.all` is doing its job.** Four queries in 136ms against 990ms
sequential is the whole difference between a responsive page and a slow one.
The registry shell already batches its four loads this way; that was not the
problem.

**Opening a connection is.** Roughly 275ms each, and the pool closed them after
**20 seconds** of inactivity — shorter than the gap between one page view and
the next, so ordinary browsing paid full reconnection cost almost every time.
Raised to 300 seconds, with `allowExitOnIdle` so seed and migration scripts
still exit promptly instead of waiting out the timeout.

### What was not the cause

Worth recording, because the log made both look guilty:

- **Data volume.** `getCategoriesByPillar` took 567ms for Hardware and 171ms for
  Software, which reads like a scaling problem. Hardware has **10 assets** and
  Software has 3. Run on their own, both queries take ~130ms; the difference was
  connection acquisition, not rows.
- **A missing index.** `getCategoriesByPillar` selects four columns from a
  four-row table. There is nothing to index.

### Still standing, by design

`loadAuthenticatedUser` re-reads the user row on every request to pick up
deactivation and role changes immediately rather than waiting for the JWT to
expire. That is one round trip — ~130ms — on the front of every page, and it is
already `cache()`-scoped so several loaders in one request share a single read.
Removing it would mean trusting the token, which is a security decision rather
than a performance one, so it has been left alone and flagged here instead.
