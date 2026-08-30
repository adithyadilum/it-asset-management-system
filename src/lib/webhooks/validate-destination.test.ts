/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { serverEnv } from '@/lib/env';
import {
  WebhookDestinationError,
  assertAllowedWebhookDestination,
  isAllowedWebhookDestination,
} from '@/lib/webhooks/validate-destination';

afterEach(() => {
  vi.unstubAllEnvs();
  // serverEnv is a parsed snapshot, so the allowlist is stubbed on it directly.
  Reflect.deleteProperty(
    serverEnv as unknown as Record<string, unknown>,
    'WEBHOOK_ALLOWED_HOSTS'
  );
});

describe('assertAllowedWebhookDestination', () => {
  it('accepts a public HTTPS destination', () => {
    expect(() =>
      assertAllowedWebhookDestination('https://hooks.example.com/eitams')
    ).not.toThrow();
  });

  it('rejects plaintext HTTP', () => {
    expect(() =>
      assertAllowedWebhookDestination('http://hooks.example.com')
    ).toThrow(WebhookDestinationError);
  });

  it('rejects a malformed URL', () => {
    expect(() => assertAllowedWebhookDestination('not-a-url')).toThrow(
      WebhookDestinationError
    );
  });

  it.each([
    'https://localhost/hook',
    'https://127.0.0.1/hook',
    'https://10.1.2.3/hook',
    'https://192.168.0.5/hook',
    'https://172.16.4.4/hook',
    'https://169.254.169.254/latest/meta-data',
    'https://metadata.google.internal/computeMetadata/v1',
    'https://[::1]/hook',
    'https://[fd00::1]/hook',
  ])('rejects the non-routable destination %s', (url) => {
    expect(() => assertAllowedWebhookDestination(url)).toThrow(
      WebhookDestinationError
    );
  });

  it('rejects a public host that is not on a configured allowlist', () => {
    (serverEnv as unknown as Record<string, unknown>).WEBHOOK_ALLOWED_HOSTS =
      'hooks.partner.com, events.partner.com';

    expect(() =>
      assertAllowedWebhookDestination('https://attacker.example.com/hook')
    ).toThrow(WebhookDestinationError);
  });

  it('accepts a host on the configured allowlist', () => {
    (serverEnv as unknown as Record<string, unknown>).WEBHOOK_ALLOWED_HOSTS =
      'hooks.partner.com, events.partner.com';

    expect(() =>
      assertAllowedWebhookDestination('https://events.partner.com/hook')
    ).not.toThrow();
  });

  it('treats an empty allowlist as unset rather than deny-all', () => {
    (serverEnv as unknown as Record<string, unknown>).WEBHOOK_ALLOWED_HOSTS =
      '  ,  ';

    expect(() =>
      assertAllowedWebhookDestination('https://hooks.example.com/hook')
    ).not.toThrow();
  });
});

describe('isAllowedWebhookDestination', () => {
  it('reports allowed and disallowed destinations without throwing', () => {
    expect(isAllowedWebhookDestination('https://hooks.example.com')).toBe(true);
    expect(isAllowedWebhookDestination('https://10.0.0.1')).toBe(false);
    expect(isAllowedWebhookDestination('')).toBe(false);
  });
});
