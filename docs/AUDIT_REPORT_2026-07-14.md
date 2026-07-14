# End-to-End Engineering Audit Report

**Project:** IT Asset Management System  
**Audit date:** 2026-07-14  
**Branch / commit:** `dev` / `e5773c8338d9256472428bb24952a4e184bf5f62`  
**Scope:** Security, performance, CI/CD, deployment, tests, and code quality  
**Change policy:** No application source or configuration was changed. This report is the only file added.

## Executive summary

The application has several strong foundations: strict TypeScript, clean ESLint results, a successful production build, a non-root runtime container, parameterized Drizzle queries, consistent Zod usage in many business flows, role helpers, transaction usage for core mutations, QStash signature verification, AES-256-GCM for integration secrets, CodeQL, Dependabot, and approximately 200 unit/component test files.

It is **not yet production-ready**. No immediately exploitable unauthenticated critical vulnerability was confirmed, but multiple high-severity weaknesses can cause authorization bypass after account deactivation, confidential-document exposure, build-secret leakage, pairing-token races, denial of service, audit gaps, and failed deployments.

### Priority summary

| Priority | Main risk | Recommended release decision |
|---|---|---|
| P0 | Inactive users remain authorized in APIs/server actions; documents are public and weakly validated; `.env` enters Docker build context; migration `0004` is missing | Block production release until fixed |
| P1 | QR exchange race, expensive API-key verification before throttling, unreliable audit writes, broken E2E workflow, broken unit suite | Fix before the next release candidate |
| P2 | Missing database indexes, blocking retry sleeps, bulk-import locking/scalability, missing browser headers, dependency advisories | Fix or explicitly accept with monitoring and owners |
| P3 | Formatting, large modules, weak coverage governance, runtime/version drift | Schedule as engineering-quality work |

## Audit scope and evidence

- Reviewed approximately 66,000 non-test TypeScript/TSX lines, 33 API route handlers, server actions, authentication, storage, integrations, database schema/migrations, Docker, GitHub Actions, Vitest, and Playwright.
- `npm run check`: **passed** (ESLint and `tsc --noEmit`).
- `npm run build`: **passed**; Next.js compiled and generated 61 routes/pages in 39.8 seconds locally.
- Vitest discovery: 199 test files. A bounded run stopped after 18 failures in 6 files (49 tests passed before bail). A focused financial test run had 8 failures in 2 files.
- `npm audit --omit=dev`: **5 moderate production-path findings**. Full audit: **9 moderate findings**, 0 high, 0 critical.
- `npx prettier --check .`: **failed**, reporting style differences in 752 files.
- E2E was not run because the local Docker daemon was unavailable. Static review also shows the GitHub E2E workflow cannot run correctly as committed.
- Secret values were never printed. `.env` and `.env.test` are ignored and not tracked; no commit history for them was found.

Limitations: this was a repository audit, not a live penetration test. It did not validate Vercel/Neon/Keycloak/Upstash/Pusher tenant settings, production IAM, branch-protection rules, WAF controls, backups/restores, DNS/TLS, cloud logs, or a deployed application. Docker image scanning and dedicated secret/SAST scanners were unavailable locally.

## Security findings

### SEC-01 — High — Deactivated accounts remain authorized outside page middleware

**Evidence:** `src/proxy.ts:162-167` explicitly excludes `/api`; `src/actions/auth.ts:39-66` returns a user even when `isActive` is false; `src/lib/auth/get-authenticated-user.ts:47-66` also returns inactive mobile users. The search API trusts JWT ID/role without checking active state (`src/app/api/v1/search/route.ts:53-75`). Many server actions call these shared helpers and do not independently reject inactive users.

**Impact:** A disabled employee/admin can continue calling API routes and server actions until token expiry/revocation. A mobile token can remain valid for up to 30 days. Page redirects do not protect mutation endpoints.

**Fix:** Make the shared authentication boundary fail closed for `isActive !== true`. For sensitive mutations, load authoritative role/status from the database, not only the JWT. On deactivation, delete `user_refresh_tokens`, revoke all linked devices, and introduce a session/version or `revokedAt` check so active cookies are invalidated immediately. Add inactive-user tests for every auth mode.

### SEC-02 — High — Sensitive documents are uploaded as public objects with spoofable type checks

**Evidence:** `src/lib/storage.ts:45-46` uploads every folder with `access: 'public'`. `src/lib/file-types.ts:69-75` and `83-90` accept a file when either the client-controlled MIME type **or** filename extension matches. SVG, Office documents, and several active formats are allowed. Disposal certificates are returned as direct URLs.

**Impact:** Invoices, warranties, disposal certificates, and other asset documents are accessible to anyone who obtains or guesses a URL. Attackers with upload permission can upload mislabeled or active content; extension/MIME checks do not inspect actual bytes. Public SVG/content can support phishing or stored active-content attacks, even if hosted on a separate origin.

**Fix:** Use private Blob storage and an authenticated download endpoint or short-lived signed URLs. Require both an allowed extension and detected magic-byte/media type, remove SVG/HTML-capable formats unless sanitized, generate server-side random object names, force `Content-Disposition: attachment`, add malware scanning/quarantine, and apply folder-specific allowlists. Add authorization tests proving a user cannot retrieve another role's/private documents.

### SEC-03 — High — Docker build context includes local secret files

**Evidence:** `Dockerfile:4-6` executes `COPY . .`. `.dockerignore` ignores only `.env*.local`, not `.env` or `.env.test`.

**Impact:** Real credentials are sent to the Docker daemon and copied into a builder layer. They can leak through remote build caches, retained intermediate images, CI artifacts, or compromised builders, even though the final runtime stage copies only standalone output.

**Fix:** Ignore `.env`, `.env.*`, test reports, docs not needed for builds, and all secret/key formats; explicitly re-include only `.env.example` if required. Never require secrets during image compilation. Use BuildKit secret mounts for the rare build-time secret and disable cache export for secret-bearing steps. Rotate any credentials if this image has been built on shared/remote infrastructure.

### SEC-04 — High — QR pairing token consumption is not atomic

**Evidence:** `src/app/api/auth/mobile-exchange/route.ts:33-40` performs separate Redis `GET` and `DEL` operations. Current DB role/status is not checked before minting the 30-day token, and the claimed marker is set before the database insert completes.

**Impact:** Two concurrent exchanges can read the same one-time token and mint multiple device JWTs. A stolen/photographed QR can be raced by an attacker. Partial failures can also show the web UI as successfully claimed when no device was persisted.

**Fix:** Atomically consume with Redis `GETDEL` or a Lua script. In the same flow, fetch the current user and require `isActive` plus the expected role. Validate device fields and request size. Persist the device before publishing a claimed marker; use an idempotency key and compensate on failure. Add a concurrent-claim test.

### SEC-05 — High — API-key throttling occurs after expensive unauthenticated work

**Evidence:** `src/lib/api/api-key-hash.ts` runs PBKDF2-SHA256 with 100,000 iterations for every presented key. `src/lib/api/with-api-key.ts` hashes and queries the database before calling `applyRateLimit` at line 92. Invalid keys are never rate-limited. The limiter key combines key ID with a forwarded IP, allowing IP variation to multiply a valid key's quota.

**Impact:** An unauthenticated attacker can consume CPU and database capacity with arbitrary keys. A valid client can evade per-key limits by changing/spoofing forwarded IPs when the app is not behind a trusted proxy.

**Fix:** Apply a cheap pre-auth IP/edge limit before hashing and a separate per-key limit after authentication. Trust only platform-provided client-IP headers. API keys already have 256 bits of randomness, so use a fast keyed HMAC/SHA-256 lookup (with a server-side pepper) and constant-time comparison; migrate hashes with versioning. Never expose a distinct expensive path for invalid keys.

### SEC-06 — High — Audit trail can silently disappear and is not immutable

**Evidence:** `src/lib/audit.ts:138-155` catches audit insert errors, including transaction-scoped audit errors, and does not rethrow. `src/lib/api/with-api-key.ts:100-123` performs last-used and audit updates as fire-and-forget promises, which serverless runtimes may terminate. `system_audit_logs` is an ordinary mutable table with no tamper-evident chain or restricted writer role.

**Impact:** Security-sensitive mutations and external API calls may succeed without a corresponding audit record. A database role capable of app writes can alter/delete the purportedly immutable ledger.

**Fix:** Define which operations must fail closed when audit persistence fails (role changes, disposal, API keys, device links) and enforce audit insert in the same transaction. Await writes or use a supported background primitive such as `waitUntil`. Use append-only database permissions/triggers, retention/export to a separate security log store, and optionally hash chaining/signing. Alert on any audit failure.

### SEC-07 — Medium — Broad Server Action origin allowance weakens CSRF protection

**Evidence:** `next.config.ts:19-20` permits 10 MB Server Action bodies and `*.ngrok-free.app` as an allowed origin in all environments.

**Impact:** Any attacker-controlled ngrok subdomain can become a trusted Server Action origin. Same-site/cookie behavior and deployment topology determine exploitability, but a wildcard tunnel domain should not be a production trust boundary. The 10 MB global limit increases memory/CPU DoS exposure.

**Fix:** Make development origins conditional on `NODE_ENV`, allow exact origins only, and keep ngrok configuration out of production builds. Reduce the global limit and grant larger limits only to dedicated upload/import endpoints with authentication, rate limits, and streaming controls.

### SEC-08 — Medium — Missing browser security headers

**Evidence:** No CSP, HSTS, frame restrictions, MIME-sniffing protection, referrer policy, or permissions policy is configured in `next.config.ts`, middleware, or deployment files.

**Impact:** XSS impact is larger, clickjacking is possible unless the hosting platform adds controls, and browser capabilities/referrer data are less constrained.

**Fix:** Add a nonce-based CSP compatible with Next.js, `frame-ancestors 'none'` (or an explicit allowlist), HSTS in production, `X-Content-Type-Options: nosniff`, strict referrer policy, and a minimal Permissions-Policy. Test headers against production responses.

### SEC-09 — Medium — Long-lived tokens and license keys are plaintext at rest

**Evidence:** `src/db/schema.ts:993-1001` stores Keycloak refresh/access/ID tokens as plaintext text fields. `src/db/schema.ts:627` stores software license keys as plaintext. Integration secrets use AES-GCM, but these fields do not.

**Impact:** A database read compromise yields reusable identity tokens and commercial license secrets.

**Fix:** Prefer not storing access/ID tokens. Encrypt required refresh tokens and license keys using envelope encryption/KMS with key versioning and rotation; limit scopes and lifetimes; restrict DB column access; redact backups/logs; revoke tokens after suspected exposure.

### SEC-10 — Medium — Mobile JWT validation is duplicated and inconsistent

**Evidence:** Many routes independently call `jose.jwtVerify`. Some require `jti`; others check it only when present. Issuer, audience, token type, device-owner binding, and active-user status are not consistently enforced. Tokens use one shared HS256 secret and last 30 days.

**Impact:** Security behavior drifts between endpoints, revocation can be bypassed by legacy/no-`jti` tokens, and tokens minted in another environment sharing the secret may be accepted.

**Fix:** Centralize mobile authentication middleware. Require `iss`, `aud`, `sub`, `jti`, token type, expiry, active device, matching device user, active account, and authoritative role. Use per-environment asymmetric signing/key IDs or a well-rotated secret. Add a route contract test matrix.

### SEC-11 — Medium — Production secret/URL validation is too weak

**Evidence:** `src/lib/env.ts` allows `NEXTAUTH_SECRET` and several signing/service secrets with `min(1)`, allows non-HTTPS URLs, and makes runtime-critical services optional even where modules instantiate clients unconditionally.

**Impact:** Weak secrets, insecure issuer/callback endpoints, or partial configurations can reach production and fail at runtime.

**Fix:** Add production-aware validation: 32+ random bytes for session/mobile secrets, exact 32-byte base64 encryption key, HTTPS for public/issuer URLs, mutually dependent service-variable groups, and explicit feature flags. Reject duplicate/obsolete variables such as the extra `JWT_SECRET` unless used.

### SEC-12 — Medium — Internal/mobile endpoints lack consistent abuse controls

**Evidence:** Rate limiting exists only in external API-key middleware. QR status/exchange, mobile APIs, search, JSON mutations, and uploads have no shared limiter. Several handlers parse JSON before schema/size checks. Server Actions permit 10 MB bodies.

**Impact:** Attackers with or without credentials can generate Redis, database, parsing, and logging load. Excel/Office uploads also create decompression-bomb risk beyond compressed file size.

**Fix:** Add edge/IP and account/device limits by route class; bound JSON/content lengths before parsing; apply row, worksheet, expanded-size, and processing-time limits; return `413`/`429`; add metrics and alerts.

### SEC-13 — Medium — Dependency advisories are not enforced in CI

`npm audit --omit=dev` reported 5 moderate production-path findings involving `next`/PostCSS and `exceljs`/`next-auth` through `uuid`. The full tree reported 9 moderate findings, adding old `esbuild` through Drizzle tooling. Relevant advisories include `GHSA-qx2v-qp2m-jg93`, `GHSA-w5hq-g745-h8pq`, and `GHSA-67mh-4wv8-2f99`.

**Fix:** Do not apply the audit tool's suggested major downgrades blindly. Upgrade to patched upstream releases/overrides when compatibility is verified, confirm whether vulnerable APIs are reachable, and document temporary exceptions with expiry. Add `npm audit --omit=dev` (or a better policy scanner), SBOM generation, license policy, and container scanning to CI.

### SEC-14 — Low — Webhook destination validation is only HTTPS validation

**Evidence:** `src/lib/validations/integrations.ts:13-22` allows any HTTPS webhook host. Dispatch is mediated through QStash, reducing direct access to the application network, but destination abuse/exfiltration remains possible for a compromised admin.

**Fix:** Add an organizational hostname allowlist or explicit admin risk confirmation; block credentials, unusual ports, redirects, link-local/private/reserved addresses after DNS resolution, and log destination changes.

## Performance and reliability findings

### PERF-01 — High — High-traffic query columns lack indexes

The schema has useful indexes on assets, assignments, disposals, notifications, API keys, webhooks, and devices, but frequent query paths lack supporting indexes:

- `system_audit_logs(performed_at DESC, id DESC)`, `(entity_type, entity_id, performed_at)`, and common filter columns.
- `maintenance_tickets(asset_id, status, created_at/estimated_return_date)`.
- `asset_purchases(asset_id)`, warranty expiry, and purchase-date paths.
- `asset_documents(asset_id)`.
- `software_licenses(is_active, expiry_date, model_id/asset_id)` and `software_allocations(license_id, revoked_at)`.
- Active assignment/overdue partial indexes and user/department lookup paths.
- Search uses leading-wildcard `ILIKE '%query%'` on asset tag/name/serial and user name/email (`src/app/api/v1/search/route.ts:87-180`), which normal B-tree indexes cannot accelerate.

**Fix:** Capture production `EXPLAIN (ANALYZE, BUFFERS)` and slow-query data, then add composite/partial indexes. Enable `pg_trgm` and GIN/GiST trigram indexes for contains-search, or use a dedicated search index. Avoid redundant low-selectivity single-column boolean indexes unless proven useful.

### PERF-02 — High — Bulk import is globally serialized and uses unsafe session locks

**Evidence:** `src/actions/bulk-import.ts:190-203` takes a fixed session advisory lock, then lines 231-312 execute one database transaction per row (up to 5,000). Unlocking at line 337 may run on a different pooled connection because the lock is session-scoped.

**Impact:** Imports can take thousands of network round trips, block all categories globally, and leak or fail to enforce the lock in pooled/serverless environments.

**Fix:** Use a dedicated connection for a session lock, a transaction-scoped lock where compatible, or a Redis lock with unique owner token and TTL. Allocate tag sequences atomically. Batch inserts in bounded chunks, preserve per-row results with staging tables/savepoints, and move large imports to an asynchronous job with progress/cancellation.

### PERF-03 — High — Notification handlers sleep inside serverless requests

**Evidence:** Email and Teams handlers perform five attempts with 1/2/4/8-second sleeps (`src/app/api/qstash/email/route.ts:367-404`, `teams/route.ts:193-243`) while QStash already provides retries.

**Impact:** Each failure can hold a serverless invocation for about 15 seconds, increasing cost, timeout risk, duplicate delivery complexity, and test time.

**Fix:** Attempt delivery once per invocation and return an appropriate non-2xx response so QStash owns backoff/retry. Include an idempotency/delivery key, cap attempts in queue metadata, and write to a DLQ after the final queue attempt.

### PERF-04 — Medium — Financial/report UI intentionally requests up to 100,000 rows

**Evidence:** `src/lib/validations/standard-reports.ts:37` permits `pageSize=100000`; the three financial ledger clients request that value for export/display.

**Impact:** Large datasets cause high DB memory, response size, server serialization, React rendering, and browser memory usage.

**Fix:** Keep interactive pages under 50–200 rows, use cursor pagination/virtualization, and implement asynchronous streamed exports with a hard row/size/time budget.

### PERF-05 — Medium — Search performs repeated full counts on every debounced query

The client debounces correctly, but each permitted search can run asset/user contains scans plus up to three report count queries, including a full audit-log count.

**Fix:** Cache summary counts, return static report descriptions, query counts only after a report is selected, and add trigram indexes. Add endpoint latency and query-count budgets.

### PERF-06 — Medium — Database pool behavior is not explicitly bounded

**Evidence:** `src/db/index.ts` creates Postgres/Neon clients without explicit maximum pool size, connection timeout, idle timeout, statement timeout, or application name.

**Impact:** Serverless scale-out or slow queries can exhaust DB connections and make incidents hard to attribute.

**Fix:** Set provider-appropriate pool/timeout limits, use a global singleton in development, configure statement/idle transaction timeouts, tag connections, and monitor pool saturation and slow queries.

### PERF-07 — Medium — Polling scales linearly with active users

Unread notifications poll every 30 seconds while Pusher is also present, and dashboard/employee data refreshes every five minutes.

**Fix:** Use Pusher invalidation as the primary path with a slower/focused fallback, suspend all polling when hidden/offline, add jitter, and measure per-user request rates.

## CI/CD and deployment findings

### CICD-01 — High — Playwright workflow cannot execute as committed

- `.github/workflows/playwright.yml:46` runs `npx run playwright test`; no `run` binary exists, while `playwright` does. Use `npm run e2e` or `npx playwright test`.
- The job already starts PostgreSQL on host port 54322, but Playwright global setup calls Docker Compose, which tries to bind the same port and will conflict.
- Global setup uses local `.env.test` loading and `drizzle-kit push`, while CI passes env variables and expects a service container.
- Only one E2E spec exists; the only real Keycloak login test is skipped. The remaining two assertions mostly validate bypass cookies/URLs, not end-to-end business behavior.

**Fix:** Choose one DB lifecycle: GitHub service container **or** Compose. Apply checked-in migrations and deterministic seeds, run `npm run e2e`, add a Keycloak test service or a clearly separated mocked-auth suite, and cover critical RBAC/mutation journeys.

### CICD-02 — High — Migration chain is incomplete and deployment has no migration gate

**Evidence:** `src/db/migrations/meta/_journal.json` includes `0004_custom_status_actions`, but `src/db/migrations/0004_custom_status_actions.sql` is missing. There is no `db:migrate` script or CI migration-from-zero test; README and E2E use schema `push`.

**Impact:** A clean or incremental production deployment can fail or silently diverge. Schema push masks the missing immutable migration history and offers no release rollback discipline.

**Fix:** Recover/regenerate and review the exact missing SQL from the snapshot/schema history. Add `db:generate` and `db:migrate`, verify migration checksum/order, test upgrade from the last release and from empty DB, take/verify backups, and define backward-compatible expand/migrate/contract plus rollback procedures.

### CICD-03 — High — Required quality gates are incomplete

CI runs lint/typecheck only on pull requests. Unit/component tests and production build are not CI jobs. Direct pushes are not covered by this workflow. Current tests are red.

**Fix:** Required PR checks should include `npm ci`, lint, typecheck, formatting, unit/component tests with coverage thresholds, production build, migration test, dependency/secret scan, and E2E smoke. Also run protected-branch push validation and nightly broader tests. Add timeouts, concurrency cancellation, and test sharding.

### CICD-04 — High — Builds are non-deterministic and runtime versions drift

**Evidence:** Both workflows and Docker use `npm install` instead of `npm ci`. CI quality uses Node 20, Docker uses Node 22, Playwright uses floating `lts/*`, and the local audit used Node 24. Test Compose uses PostgreSQL 17 while CI uses 16. Base images are mutable tags.

**Fix:** Declare one supported Node version in `engines` and `.nvmrc`/`.node-version`, use it everywhere, use `npm ci`, align PostgreSQL versions, pin images by digest, and add a scheduled upgrade lane rather than floating production gates.

### CICD-05 — Medium — Supply-chain controls are partial

CodeQL and Dependabot are positive, but actions are pinned only to major tags, dependency audit is not enforced, and there is no secret, container, Dockerfile/IaC, SBOM, provenance, or license scan.

**Fix:** Pin Actions to full commit SHAs with Renovate/Dependabot updates; use least-privilege `permissions` in every workflow; add secret scanning/push protection, dependency policy, SBOM (CycloneDX/SPDX), container scan, signed provenance/image, and license checks.

### CICD-06 — Medium — Deployment and operational readiness are not represented as code

There is no repository deployment workflow, environment approval, health/readiness check, smoke test, rollback automation, or release evidence. Docker has no `HEALTHCHECK`; Compose has no app health/restart/resource policy.

**Fix:** Document the externally managed Vercel/CD configuration or codify it. Gate production with environment approvals, migration completion, health/smoke checks, observability verification, and rollback. Add `/health/live` and `/health/ready` without sensitive details and container health checks.

### CICD-07 — Medium — Repository governance is minimal

`CODEOWNERS` names one person. Repository-local evidence cannot confirm branch protection, required reviews, signed commits, or admin bypass restrictions.

**Fix:** Use team-based ownership, require at least two reviewers for security/auth/migration changes, protect `main`/`dev`, require all checks and conversation resolution, restrict force pushes/admin bypass, and enable signed releases. Verify these settings in GitHub.

## Code quality and testing findings

### CQ-01 — High — Test suite is red and CI does not run it

The bounded run found 18 failures before stopping. Several auth mocks call role predicates with the entire user instead of `user.role`, while other mocks return `undefined` from `enforceActionAccess`, causing production code to read `user.role` from undefined. Additional failures include audit history mocks, notification actions, currency formatting, and accessible button-name expectations. Numerous React `act()` and chart-size warnings make output noisy.

**Fix:** Create one canonical auth mock matching the real helper contract; remove per-file copies. Fix all failures/warnings, fail CI on unhandled console errors, and prevent merge while tests are red.

### CQ-02 — High — Production invoice upload is placeholder behavior

**Evidence:** `src/actions/assets.ts:183-187` stores a fabricated `placeholder-storage.com` URL containing the original filename, and cleanup at lines 68-74 only logs “fake-removing”.

**Impact:** Users can receive broken invoice links; failed transactions leave real uploads unmanaged once storage is enabled; filenames can leak data.

**Fix:** Implement the same hardened private-storage abstraction as SEC-02, persist only after successful upload, delete/compensate on transaction failure, and add lifecycle/orphan cleanup tests.

### CQ-03 — Medium — Formatting is effectively unmanaged

Prettier check reports 752 files and there is no format script/gate.

**Fix:** Agree on line endings/style, run one isolated formatting-only change, add `format`/`format:check`, and enforce it in CI/pre-commit without mixing formatting into feature diffs.

### CQ-04 — Medium — Large modules increase defect and review risk

Examples include a 47 KB master-data client, 46 KB master-data action module, 35 KB maintenance action module, 34 KB operations repository, 33 KB audit action module, and an 18 KB cron route.

**Fix:** Split by bounded use case and layer: validation, authorization, query/repository, service/transaction, presentation. Keep auth and audit policy centralized. Add complexity/import-boundary checks.

### CQ-05 — Medium — Coverage cannot be measured or enforced

No Vitest coverage provider is installed and no thresholds exist. There are many test files, but file count is not a quality metric and critical negative authorization/concurrency/migration scenarios are missing.

**Fix:** Add V8 coverage with meaningful changed-line and critical-module thresholds; prioritize auth, mobile pairing, API keys, audit, upload, migrations, and bulk import. Use mutation testing selectively for authorization predicates.

### CQ-06 — Medium — Type/lint escape hatches reduce signal

`allowJs` and `skipLibCheck` are enabled; production source contains approximately 41 `any` occurrences and 18 ESLint disables; test lint disables several important rules globally.

**Fix:** Remove `allowJs` after converting the remaining JS helper, evaluate disabling `skipLibCheck`, replace `any` at transaction/query boundaries, and narrow lint exceptions to specific lines with reasons.

### CQ-07 — Medium — Authentication logic is duplicated across many routes

Web cookie, mobile JWT, device revocation, role normalization, and active-user checks are repeatedly implemented. The inconsistencies documented in SEC-01 and SEC-10 are a direct result.

**Fix:** Introduce tested `requireWebUser`, `requireMobileUser`, `requireApiKey`, and `requireRole` boundaries returning one canonical principal. Route handlers should contain business logic only after the principal is established.

### CQ-08 — Low — Layering is inconsistent

Some pages import the database directly while most use actions/repositories, and database driver selection/configuration is mixed in one module.

**Fix:** Enforce server-only repository boundaries with ESLint import restrictions; keep pages/controllers thin and queries independently testable.

## Positive controls observed

- Strict TypeScript and ESLint pass.
- Production build passes.
- SQL is predominantly parameterized through Drizzle; reviewed `sql.raw` fragments are generated from static internal depreciation expressions, not direct request input.
- AES-256-GCM uses random 12-byte IVs and authentication tags for configured integration secrets.
- Webhook HMAC verification uses `timingSafeEqual`.
- QStash handlers fail closed when signatures/keys are missing or invalid.
- External APIs use scoped, revocable, expiring keys and bounded pagination.
- Core asset/disposal/assignment mutations often use transactions and ownership/state predicates.
- Runtime container uses a non-root user and standalone output.
- CodeQL and Dependabot are configured.

## Remediation roadmap

### First 48 hours (release blockers)

1. Reject inactive users centrally; revoke sessions/refresh tokens/devices on deactivation.
2. Make document storage private and disable weak/active-content uploads until hardened.
3. Exclude all env/secret files from Docker context and rotate secrets if shared builders were used.
4. Restore migration `0004`; validate clean and upgrade migrations.
5. Fix QR token atomic consumption and authoritative account checks.
6. Put a cheap limiter before API-key PBKDF2 and rate-limit invalid attempts.

### First week

1. Repair unit tests and make test/build required CI gates.
2. Rebuild the Playwright workflow around one database lifecycle and real critical journeys.
3. Make critical audit writes transactional/reliable.
4. Remove wildcard production origins and add security headers.
5. Eliminate in-handler retry sleeps; delegate retries to QStash.
6. Add the highest-value indexes after query-plan validation.

### First month

1. Redesign bulk import as a bounded asynchronous/staging workflow.
2. Encrypt identity/license secrets at rest and establish key rotation.
3. Centralize authentication middleware and add route-level negative tests.
4. Add coverage, formatting, SBOM, secret/container scanning, pinned actions/images, and deployment smoke/rollback gates.
5. Add pool/slow-query metrics, endpoint SLOs, error tracking, security alerts, and backup-restore drills.

## Suggested release gate

Do not approve a production release until all P0 items are resolved and independently verified. Require a green run of lint, typecheck, formatting, unit/component tests, production build, migration-from-zero and upgrade tests, dependency/secret scans, and critical Playwright journeys. Any deferred P1/P2 finding should have a named owner, due date, compensating control, and written risk acceptance.
