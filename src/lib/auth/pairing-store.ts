import { Redis } from '@upstash/redis';
import { serverEnv } from '@/lib/env';
import { createHmac } from 'node:crypto';

/** Bind a committed device to its QR without storing the QR credential. */
export function pairingDeviceId(token: string): string {
  return createHmac('sha256', serverEnv.MOBILE_JWT_SECRET)
    .update(`device-pairing:${token}`)
    .digest('hex');
}

export function createPairingStore() {
  return new Redis({
    url: serverEnv.UPSTASH_REDIS_REST_URL,
    token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
    // GETDEL consumes a single-use credential. Replaying it after a lost reply
    // can turn a valid exchange into a false "expired" response.
    retry: false,
    signal: () => AbortSignal.timeout(4_000),
  });
}
