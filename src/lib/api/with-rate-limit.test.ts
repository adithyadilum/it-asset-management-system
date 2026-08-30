/**
 * @vitest-environment node
 */

import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withRateLimit } from '@/lib/api/with-rate-limit';
import { applyRateLimit, isRateLimitConfigured } from '@/lib/api/rate-limiter';

vi.mock('@/lib/api/rate-limiter', () => ({
  applyRateLimit: vi.fn(),
  isRateLimitConfigured: vi.fn(),
  injectRateLimitHeaders: vi.fn((response) => response),
}));

const mockApply = vi.mocked(applyRateLimit);
const mockConfigured = vi.mocked(isRateLimitConfigured);

function createRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/test', { headers });
}

const allowed = { success: true, limit: 100, remaining: 99, reset: 0 };
const blocked = { success: false, limit: 100, remaining: 0, reset: 0 };

describe('withRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigured.mockReturnValue(true);
  });

  it('passes the request through when under the limit', async () => {
    mockApply.mockResolvedValue(allowed);
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const response = await withRateLimit('test', handler)(createRequest());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('returns 429 and never runs the handler when over the limit', async () => {
    mockApply.mockResolvedValue(blocked);
    const handler = vi.fn();

    const response = await withRateLimit('test', handler)(createRequest());

    expect(response.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });

  it('keys the bucket on the platform-controlled IP header first', async () => {
    mockApply.mockResolvedValue(allowed);
    const handler = vi.fn().mockResolvedValue(NextResponse.json({}));

    await withRateLimit(
      'scan',
      handler
    )(
      createRequest({
        'x-vercel-forwarded-for': '203.0.113.7',
        // Client-settable, so it must lose to the platform header.
        'x-forwarded-for': '198.51.100.1',
      })
    );

    expect(mockApply).toHaveBeenCalledWith('scan:203.0.113.7');
  });

  it('falls back to x-forwarded-for, taking the first hop', async () => {
    mockApply.mockResolvedValue(allowed);
    const handler = vi.fn().mockResolvedValue(NextResponse.json({}));

    await withRateLimit(
      'scan',
      handler
    )(createRequest({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }));

    expect(mockApply).toHaveBeenCalledWith('scan:198.51.100.1');
  });

  it('skips the limiter entirely when Redis is not configured', async () => {
    mockConfigured.mockReturnValue(false);
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const response = await withRateLimit('test', handler)(createRequest());

    expect(response.status).toBe(200);
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('serves the request when the limiter itself fails', async () => {
    mockApply.mockRejectedValue(new Error('upstash unreachable'));
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const response = await withRateLimit('test', handler)(createRequest());

    // A limiter outage must not become an application outage.
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('forwards route context to the wrapped handler', async () => {
    mockApply.mockResolvedValue(allowed);
    const handler = vi.fn().mockResolvedValue(NextResponse.json({}));
    const ctx = { params: Promise.resolve({ id: '1' }) };

    await withRateLimit('test', handler)(createRequest(), ctx);

    expect(handler).toHaveBeenCalledWith(expect.anything(), ctx);
  });
});
