import { serverEnv } from '@/lib/env';
import * as jose from 'jose';
import { db } from '@/db';
import { users, linkedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/actions/auth';
import { TtlCache } from '@/lib/ttl-cache';
import type { AuthenticatedUser } from '@/actions/auth';

export { getAuthenticatedUser };
export { canManageAssets } from '@/lib/auth/roles';
export type { AuthenticatedUser };
export type { UserRole } from '@/types/auth';

const MOBILE_SECRET = new TextEncoder().encode(serverEnv.MOBILE_JWT_SECRET);

export const MOBILE_JWT_ISSUER = new URL(serverEnv.NEXTAUTH_URL).origin;
export const MOBILE_JWT_AUDIENCE = 'eitams-mobile';

/**
 * `lastActiveAt` is a presence indicator on the devices settings page, so
 * second-level precision has no value. Writing it on every authenticated
 * request put a row lock and a WAL record on the critical path of every mobile
 * call — a continuous write stream from a device that merely polls.
 */
const DEVICE_ACTIVITY_TTL_MS = 5 * 60 * 1000;
const deviceActivityThrottle = new TtlCache<true>(DEVICE_ACTIVITY_TTL_MS);

function recordDeviceActivity(deviceId: string): void {
  if (deviceActivityThrottle.has(deviceId)) return;
  deviceActivityThrottle.set(deviceId, true);

  // Fire and forget: a missed heartbeat is not worth delaying the response.
  void Promise.resolve(
    db
      .update(linkedDevices)
      .set({ lastActiveAt: new Date() })
      .where(eq(linkedDevices.id, deviceId))
  ).catch((error) => {
    console.error('[auth] Failed to record device activity:', error);
  });
}

export type AuthenticatedMobileUser = AuthenticatedUser & {
  deviceId: string;
  jwtId: string;
};

export async function getAuthenticatedMobileUserFromRequest(
  req: Request
): Promise<AuthenticatedMobileUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const { payload } = await jose.jwtVerify(token, MOBILE_SECRET, {
      issuer: MOBILE_JWT_ISSUER,
      audience: MOBILE_JWT_AUDIENCE,
    });

    const userId = typeof payload.id === 'string' ? payload.id : '';
    const jwtId = typeof payload.jti === 'string' ? payload.jti : '';
    if (!userId || !jwtId) return null;

    const [device] = await db
      .select({ id: linkedDevices.id, userId: linkedDevices.userId })
      .from(linkedDevices)
      .where(
        and(
          eq(linkedDevices.jwtId, jwtId),
          eq(linkedDevices.userId, userId),
          eq(linkedDevices.isRevoked, false)
        )
      )
      .limit(1);
    if (!device) return null;

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .limit(1);
    if (!user) return null;

    recordDeviceActivity(device.id);

    return { ...user, deviceId: device.id, jwtId };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUserFromRequest(
  req?: Request
): Promise<AuthenticatedUser | null> {
  // If request object is passed, check for Bearer Token in Authorization header
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return getAuthenticatedMobileUserFromRequest(req);
    }
  }

  // Fallback to cookie-based authentication
  return getAuthenticatedUser();
}
