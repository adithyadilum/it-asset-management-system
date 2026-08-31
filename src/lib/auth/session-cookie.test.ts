import { describe, expect, it } from 'vitest';

import { sessionCookieNamesToClear } from './session-cookie';

describe('sessionCookieNamesToClear', () => {
  it('clears the plain and secure session cookies', () => {
    expect(
      sessionCookieNamesToClear([
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
      ])
    ).toEqual(['next-auth.session-token', '__Secure-next-auth.session-token']);
  });

  it('clears chunked session cookies', () => {
    // The regression this guards: the JWT carries three Keycloak tokens, so it
    // routinely exceeds 4096 bytes and NextAuth splits it. Matching only the
    // unchunked name deleted nothing on exactly those sessions.
    expect(
      sessionCookieNamesToClear([
        '__Secure-next-auth.session-token.0',
        '__Secure-next-auth.session-token.1',
      ])
    ).toEqual([
      '__Secure-next-auth.session-token.0',
      '__Secure-next-auth.session-token.1',
    ]);
  });

  it('leaves unrelated cookies alone', () => {
    expect(
      sessionCookieNamesToClear([
        'next-auth.csrf-token',
        'next-auth.callback-url',
        'theme',
      ])
    ).toEqual([]);
  });

  it('does not match a cookie that merely starts with the same text', () => {
    expect(
      sessionCookieNamesToClear(['next-auth.session-token-backup'])
    ).toEqual([]);
  });

  it('returns nothing when no cookies are present', () => {
    expect(sessionCookieNamesToClear([])).toEqual([]);
  });
});
