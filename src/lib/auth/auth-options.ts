import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import KeycloakProvider from 'next-auth/providers/keycloak';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
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

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.KEYCLOAK_CLIENT_ID!,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      idToken: refreshedTokens.id_token,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
    };
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
        console.error("Login rejected: No email provided by Keycloak.");
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
            name: profile?.name || profile?.preferred_username || user?.name || "New User",
            // CRITICAL: Always default to the lowest privilege tier
            role: 'Employee',
            isActive: true,
          });
          console.log(`[AUTH] JIT Provisioned new user: ${normalizedEmail}`);
        } catch (error) {
          console.error("Failed to auto-provision user:", error);
          return false; // Reject login if DB insert fails
        }
      } else if (!existingUser.isActive) {
        console.error(`Login rejected: User ${normalizedEmail} is inactive.`);
        return false; // Reject login if user is inactive
      }

      return true; // Let them in!
    },

    /**
     * jwt – Runs on every request but ONLY hits the DB on the first login
     * (when `account` is present). On subsequent requests, the baked-in
     * token fields are reused — zero DB overhead.
     */
    async jwt({ token, account }) {
      // Initial sign in
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
          }
        }
        return token;
      }

      // Return previous token if the access token has not expired yet
      // We add a small buffer (e.g., 60 seconds) to prevent tokens expiring just after the check
      if (Date.now() < (token.accessTokenExpires as number) - 60 * 1000) {
        return token;
      }

      // Access token has expired, try to update it
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
