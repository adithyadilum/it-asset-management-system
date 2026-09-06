/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from './route';

/** Builds a request carrying the cookies a real broken session would have. */
function request(url: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(url, 'http://localhost:3000'));
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

/** Cookie names the response asks the browser to drop. */
function clearedCookies(response: Response) {
  return response.headers
    .getSetCookie()
    .filter((header) => /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(header))
    .map((header) => header.split('=')[0]);
}

describe('GET /api/auth/session-expired', () => {
  it('clears the session cookie and forwards to /login', async () => {
    const response = await GET(
      request('/api/auth/session-expired', {
        'next-auth.session-token': 'dead',
        theme: 'dark',
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirectTo=%2Fdashboard'
    );
    expect(clearedCookies(response)).toEqual(['next-auth.session-token']);
  });

  it('clears every chunk of a split session cookie', async () => {
    const response = await GET(
      request('/api/auth/session-expired', {
        '__Secure-next-auth.session-token.0': 'part-one',
        '__Secure-next-auth.session-token.1': 'part-two',
      })
    );

    expect(clearedCookies(response).sort()).toEqual([
      '__Secure-next-auth.session-token.0',
      '__Secure-next-auth.session-token.1',
    ]);
  });

  it('returns the user to where they were, but never to /login itself', async () => {
    const kept = await GET(
      request('/api/auth/session-expired?redirectTo=%2Fassets%2F42')
    );
    expect(kept.headers.get('location')).toBe(
      'http://localhost:3000/login?redirectTo=%2Fassets%2F42'
    );

    // An off-site target would turn this into an open redirect.
    const rejected = await GET(
      request('/api/auth/session-expired?redirectTo=https%3A%2F%2Fevil.test')
    );
    expect(rejected.headers.get('location')).toBe(
      'http://localhost:3000/login?redirectTo=%2Fdashboard'
    );
  });
});
