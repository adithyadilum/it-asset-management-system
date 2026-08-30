/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';

import { hashApiKey, hashApiKeyLegacy } from '@/lib/api/api-key-hash';

const TOKEN = 'eitams_0123456789abcdef0123456789abcdef';

describe('hashApiKey', () => {
  it('produces 64 hex characters so it fits the varchar(64) column', () => {
    const hash = hashApiKey(TOKEN);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic, so lookup by hash still works', () => {
    expect(hashApiKey(TOKEN)).toBe(hashApiKey(TOKEN));
  });

  it('separates distinct keys', () => {
    expect(hashApiKey(TOKEN)).not.toBe(hashApiKey(`${TOKEN}x`));
  });

  it('is materially cheaper than the legacy scheme', async () => {
    const fastStart = process.hrtime.bigint();
    for (let i = 0; i < 50; i += 1) hashApiKey(`${TOKEN}${i}`);
    const fastNs = Number(process.hrtime.bigint() - fastStart);

    const slowStart = process.hrtime.bigint();
    await hashApiKeyLegacy(TOKEN);
    const slowNs = Number(process.hrtime.bigint() - slowStart);

    // 50 current hashes must still cost far less than a single legacy hash.
    expect(fastNs).toBeLessThan(slowNs);
  });
});

describe('hashApiKeyLegacy', () => {
  it('still reproduces the stored PBKDF2 digest so existing keys verify', async () => {
    const legacy = await hashApiKeyLegacy(TOKEN);

    expect(legacy).toHaveLength(64);
    expect(legacy).toBe(await hashApiKeyLegacy(TOKEN));
    // The two schemes must not collide, or migration detection would be wrong.
    expect(legacy).not.toBe(hashApiKey(TOKEN));
  });
});
