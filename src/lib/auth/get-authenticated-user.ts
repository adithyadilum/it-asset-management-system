import { serverEnv } from '@/lib/env';
import * as jose from 'jose';
import { db } from '@/db';
import { users, linkedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';
import type { AuthenticatedUser } from '@/actions/auth';

export { getAuthenticatedUser };
export { canManageAssets } from '@/lib/auth/roles';
export type { AuthenticatedUser };
export type { UserRole } from '@/types/auth';

const MOBILE_SECRET = new TextEncoder().encode(
  serverEnv.MOBILE_JWT_SECRET
);

export async function getAuthenticatedUserFromRequest(req?: Request): Promise<AuthenticatedUser | null> {
  // If request object is passed, check for Bearer Token in Authorization header
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const { payload } = await jose.jwtVerify(token, MOBILE_SECRET);

        // Verify the device is still active (not revoked)
        if (payload.jti) {
          const [device] = await db
            .select({ id: linkedDevices.id, isRevoked: linkedDevices.isRevoked })
            .from(linkedDevices)
            .where(
              and(
                eq(linkedDevices.jwtId, payload.jti),
                eq(linkedDevices.isRevoked, false)
              )
            )
            .limit(1);

          if (!device) {
            return null;
          }
        }

        const userId = String(payload.id);
        if (userId) {
          const [user] = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
              isActive: users.isActive,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
            };
          }
        }
      } catch (error) {
        console.error('getAuthenticatedUserFromRequest: JWT verification failed', error);
      }
    }
  }

  // Fallback to cookie-based authentication
  return getAuthenticatedUser();
}

