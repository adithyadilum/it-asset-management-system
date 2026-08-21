import 'server-only';

import Pusher from 'pusher';

import { serverEnv } from '@/lib/env';
import { clientEnv } from '@/lib/env.client';

let pusherClient: Pusher | null = null;

/**
 * Shared server-side Pusher client.
 *
 * Constructing a client allocates an HTTP agent and connection pool, so doing
 * it per request — as the barcode-injection and device-unlink routes did —
 * throws that away on every call. Memoized the same way the rate limiter
 * memoizes its Ratelimit instances.
 *
 * Returns `null` when Pusher is not configured, so callers can degrade rather
 * than throw; realtime updates are an enhancement, not a correctness
 * requirement.
 */
export function getPusherServerClient(): Pusher | null {
  if (pusherClient) return pusherClient;

  const appId = serverEnv.PUSHER_APP_ID;
  const secret = serverEnv.PUSHER_SECRET;
  const key = clientEnv.NEXT_PUBLIC_PUSHER_KEY;

  if (!appId || !secret || !key) return null;

  pusherClient = new Pusher({
    appId,
    key,
    secret,
    cluster: clientEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
  });

  return pusherClient;
}
