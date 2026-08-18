import { serverEnv } from '@/lib/env';

/**
 * Hostnames that resolve back to the deployment or its metadata services.
 * Delivering an event to one of these turns a webhook into a request forgery
 * primitive against internal infrastructure.
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '::',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

/** Loopback, RFC1918, link-local, and unique-local ranges. */
const BLOCKED_ADDRESS_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/i,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];

export class WebhookDestinationError extends Error {}

function normalizeHostname(hostname: string): string {
  // URL keeps IPv6 literals bracketed; strip them for range matching.
  const unbracketed = hostname.replace(/^\[|\]$/g, '');
  return unbracketed.toLowerCase();
}

/**
 * Returns the configured host allowlist, or `null` when none is set.
 * An unset allowlist means "any public host", which is the prior behavior.
 */
export function getWebhookAllowedHosts(): string[] | null {
  const raw = serverEnv.WEBHOOK_ALLOWED_HOSTS;
  if (!raw) return null;

  const hosts = raw
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return hosts.length > 0 ? hosts : null;
}

/**
 * Validates a webhook destination.
 *
 * Applied both when a subscription is written and again at dispatch, so rows
 * created before this guard existed cannot be used to reach an internal host.
 *
 * @throws {WebhookDestinationError} when the destination is not permitted.
 */
export function assertAllowedWebhookDestination(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new WebhookDestinationError('Webhook URL is not a valid URL');
  }

  if (url.protocol !== 'https:') {
    throw new WebhookDestinationError('Webhook destination must use HTTPS');
  }

  const hostname = normalizeHostname(url.hostname);

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new WebhookDestinationError(
      'Webhook destination is not externally routable'
    );
  }

  if (BLOCKED_ADDRESS_PATTERNS.some((pattern) => pattern.test(hostname))) {
    throw new WebhookDestinationError(
      'Webhook destination targets a private network range'
    );
  }

  const allowlist = getWebhookAllowedHosts();
  if (allowlist && !allowlist.includes(hostname)) {
    throw new WebhookDestinationError(
      `Webhook destination ${url.hostname} is not on the configured allowlist`
    );
  }

  return url;
}

/** Non-throwing form, for filtering stored rows at dispatch time. */
export function isAllowedWebhookDestination(rawUrl: string): boolean {
  try {
    assertAllowedWebhookDestination(rawUrl);
    return true;
  } catch {
    return false;
  }
}
