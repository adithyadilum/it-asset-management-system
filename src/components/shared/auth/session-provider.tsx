'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

/**
 * How often to poll `/api/auth/session`.
 *
 * Without an interval NextAuth refetches only on mount and on tab visibility
 * changes, and that route is the only one that writes a rotated session cookie
 * back to the browser: `getServerSession()` in a Server Component runs the
 * `jwt` callback but cannot set cookies, so the rotation it performs is
 * discarded. A user navigating client-side without ever switching tabs
 * therefore carried a cookie whose timestamps never advanced -- and every
 * server render re-entered the refresh path, opening a locked transaction to
 * rediscover a token the database had already refreshed.
 *
 * Four minutes sits inside Keycloak's default five-minute access-token
 * lifetime, so a poll lands while the cookie is still fresh and the refresh
 * happens on the one request that can persist its result. Extra tabs are cheap:
 * the `jwt` callback dedupes concurrent refreshes behind a Postgres advisory
 * lock, so they cost a database read rather than a Keycloak round trip.
 */
const SESSION_POLL_SECONDS = 4 * 60;

export function NextAuthSessionProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <SessionProvider
      refetchInterval={SESSION_POLL_SECONDS}
      refetchOnWindowFocus
    >
      {children}
    </SessionProvider>
  );
}
