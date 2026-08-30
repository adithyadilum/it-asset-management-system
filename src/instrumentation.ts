/**
 * Runs once when a Next.js server instance boots.
 *
 * Used to fail fast on a misconfigured production deployment (SEC-C).
 *
 * Two guards, both load-bearing:
 *
 * - Next.js runs `register()` in *every* runtime it builds, including Edge. The
 *   services being checked — Redis, blob storage, QStash — are Node-side
 *   concerns, and importing the env module from the Edge bundle only drags
 *   Node-only dependencies somewhere they cannot run.
 * - The build phase is skipped: compiling the application does not require
 *   runtime service credentials, only serving requests does.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { assertProductionEnv } = await import('@/lib/env');
  assertProductionEnv();
}
