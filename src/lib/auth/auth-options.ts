import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import KeycloakProvider from 'next-auth/providers/keycloak';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

import { db } from '@/db';
import { users, userRefreshTokens } from '@/db/schema';
import type { UserRole } from '@/types/auth';

function normalizeRole(role: unknown): UserRole {
  if (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinanceAuditor' ||
    role === 'Employee'
  ) {
    return role;
  }

  return 'Employee';
}

/**
 * Converts a UUID string into a signed 64-bit integer suitable for use as a
 * Postgres advisory lock key. We XOR the high and low 64-bit halves of the
 * UUID so that the key is deterministic and stable across workers/processes.
 */
function uuidToLockKey(uuid: string): bigint {
  const hex = uuid.replace(/-/g, '');
  const high = BigInt('0x' + hex.slice(0, 16));
  const low = BigInt('0x' + hex.slice(16));
  // XOR and reinterpret as signed int64 (Postgres bigint)
  return BigInt.asIntN(64, high ^ low);
}

/**
 * Attempts to refresh the Keycloak access token using the server-side
 * refresh token store with a Postgres advisory lock.
 *
 * Why a DB lock instead of an in-memory Map?
 * Next.js Turbopack (and production clusters) spin up multiple Node.js worker
 * processes. Each worker has its own heap, so `globalThis` is NOT shared.
 * An in-memory Map only deduplicates within a single worker — concurrent
 * requests hitting different workers both fire against Keycloak with the same
 * refresh token, triggering Keycloak's RTR revocation.
 *
 * pg_advisory_xact_lock is a true cross-process mutex: all workers share the
 * same Postgres connection pool and therefore the same lock namespace.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  const userId = token.id as string;

  if (!userId) {
    console.error('[AUTH] refreshAccessToken called with no user ID in token');
    return { ...token, error: 'RefreshAccessTokenError' };
  }

  try {
    return await db.transaction(async (tx) => {
      // ── 1. Acquire a cross-process advisory lock for this user ──────────
      // This blocks until no other worker holds the lock, serialising all
      // concurrent refresh attempts for this user.
      const lockKey = uuidToLockKey(userId);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

      // ── 2. Re-read the authoritative state from DB ───────────────────────
      // Another worker may have already completed a refresh while we waited
      // for the lock. If so, the DB now has a valid (non-expired) expiry.
      const [stored] = await tx
        .select()
        .from(userRefreshTokens)
        .where(eq(userRefreshTokens.userId, userId))
        .limit(1);

      const BUFFER_MS = 60 * 1000; // 60-second pre-expiry buffer
      if (stored && stored.accessTokenExpires.getTime() > Date.now() + BUFFER_MS) {
        // Another worker already refreshed — return without hitting Keycloak.
        console.log(`[AUTH] Token already refreshed by peer worker for user ${userId}, skipping Keycloak call`);
        return {
          ...token,
          accessToken: stored.accessToken ?? (token.accessToken as string),
          idToken: stored.idToken ?? (token.idToken as string),
          refreshToken: stored.refreshToken,
          accessTokenExpires: stored.accessTokenExpires.getTime(),
          error: undefined,
        };
      }

      // ── 3. Hit Keycloak — we are the one worker that won the lock ────────
      const refreshTokenToUse = stored?.refreshToken ?? (token.refreshToken as string);
      const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.KEYCLOAK_CLIENT_ID!,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: refreshTokenToUse,
        }),
      });

      const refreshedTokens = await response.json();

      if (!response.ok) {
        throw refreshedTokens;
      }

      const newRefreshToken: string = refreshedTokens.refresh_token ?? refreshTokenToUse;
      const newExpires = new Date(Date.now() + (refreshedTokens.expires_in as number) * 1000);
      // refresh_expires_in is the Keycloak field for how long the refresh token
      // itself is valid (seconds). Fall back to 30 days if not present.
      const newRefreshExpires =
        typeof refreshedTokens.refresh_expires_in === 'number'
          ? Date.now() + refreshedTokens.refresh_expires_in * 1000
          : Date.now() + 30 * 24 * 60 * 60 * 1000;

      // ── 4. Persist the new refresh token before releasing the lock ────────
      await tx
        .insert(userRefreshTokens)
        .values({
          userId,
          refreshToken: newRefreshToken,
          accessToken: refreshedTokens.access_token as string,
          idToken: refreshedTokens.id_token as string,
          accessTokenExpires: newExpires,
        })
        .onConflictDoUpdate({
          target: userRefreshTokens.userId,
          set: {
            refreshToken: newRefreshToken,
            accessToken: refreshedTokens.access_token as string,
            idToken: refreshedTokens.id_token as string,
            accessTokenExpires: newExpires,
            updatedAt: new Date(),
          },
        });

      // Lock is automatically released when the transaction commits here.
      console.log(`[AUTH] Successfully refreshed token for user ${userId}`);

      return {
        ...token,
        accessToken: refreshedTokens.access_token as string,
        idToken: refreshedTokens.id_token as string,
        refreshToken: newRefreshToken,
        accessTokenExpires: newExpires.getTime(),
        refreshTokenExpires: newRefreshExpires,
        error: undefined,
      };
    });
  } catch (error) {
    console.error('Error refreshing access token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER,
    }),
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    /**
     * signIn – Just-in-Time (JIT) auto-provisions new users who exist in
     * Keycloak but not in the local database, defaulting them to the
     * "Employee" role. Also rejects inactive existing users.
     */
    async signIn({ user, profile }) {
      const email = profile?.email || user?.email;
      if (!email) {
        console.error('Login rejected: No email provided by Keycloak.');
        return false;
      }

      const normalizedEmail = email.toLowerCase();

      // Check if user already exists in PostgreSQL
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      });

      // JIT Provisioning
      if (!existingUser) {
        try {
          await db.insert(users).values({
            email: normalizedEmail,
            // Fallback to preferred_username if name isn't set in Keycloak/Entra
            name: profile?.name || profile?.preferred_username || user?.name || 'New User',
            // CRITICAL: Always default to the lowest privilege tier
            role: 'Employee',
            isActive: true,
          });
          console.log(`[AUTH] JIT Provisioned new user: ${normalizedEmail}`);
        } catch (error) {
          console.error('Failed to auto-provision user:', error);
          return false; // Reject login if DB insert fails
        }
      } else if (!existingUser.isActive) {
        console.error(`Login rejected: User ${normalizedEmail} is inactive.`);
        return false; // Reject login if user is inactive
      }

      return true; // Let them in!
    },

    /**
     * jwt – Called on every request.
     *
     * On the initial sign-in (account is present), we persist the refresh
     * token to the DB so subsequent refreshes always read from the authoritative
     * server-side store rather than the (potentially stale) cookie payload.
     *
     * On subsequent requests we check the expiry and call refreshAccessToken
     * when needed. The DB-level advisory lock inside that function ensures only
     * one worker hits Keycloak regardless of concurrency.
     */
    async jwt({ token, account }) {
      // ── Initial sign in ──────────────────────────────────────────────────
      if (account) {
        token.idToken = account.id_token;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        // account.expires_at is in seconds from epoch
        token.accessTokenExpires = (account.expires_at as number) * 1000;

        const email = token.email?.toLowerCase();

        if (email) {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.email, email),
            columns: { id: true, role: true, name: true },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = normalizeRole(dbUser.role);
            token.name = dbUser.name;

            // Persist the initial refresh token to the authoritative DB store
            if (account.refresh_token && account.expires_at) {
              // Store the refresh token expiry in the JWT so the proxy can detect
              // a completely dead session without a DB call from the edge runtime.
              // Keycloak returns refresh_expires_in (seconds); fall back to 30 days.
              const refreshExpiresIn =
                typeof (account as Record<string, unknown>).refresh_expires_in === 'number'
                  ? (account as Record<string, unknown>).refresh_expires_in as number
                  : 30 * 24 * 60 * 60;
              token.refreshTokenExpires = Date.now() + refreshExpiresIn * 1000;

              await db
                .insert(userRefreshTokens)
                .values({
                  userId: dbUser.id,
                  refreshToken: account.refresh_token,
                  accessToken: account.access_token,
                  idToken: account.id_token,
                  accessTokenExpires: new Date((account.expires_at as number) * 1000),
                })
                .onConflictDoUpdate({
                  target: userRefreshTokens.userId,
                  set: {
                    refreshToken: account.refresh_token,
                    accessToken: account.access_token,
                    idToken: account.id_token,
                    accessTokenExpires: new Date((account.expires_at as number) * 1000),
                    updatedAt: new Date(),
                  },
                });
            }
          }
        }
        return token;
      }

      // ── Subsequent requests ──────────────────────────────────────────────
      // 60-second buffer: refresh before the token actually expires to avoid
      // serving a request with a token that expires mid-flight.
      const BUFFER_MS = 60 * 1000;

      // If token refresh already failed, do not retry on every request
      if (token.error === 'RefreshAccessTokenError') {
        return token;
      }

      if (Date.now() < (token.accessTokenExpires as number) - BUFFER_MS) {
        return token;
      }

      // Access token has expired (or is about to). Refresh it.
      return refreshAccessToken(token);
    },

    /**
     * session – Maps the JWT token fields onto the session object
     * that client components receive via `useSession()`.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }

      session.idToken = token.idToken;
      session.error = token.error;

      return session;
    },
  },

  pages: {
    signIn: '/login',
  },
};
