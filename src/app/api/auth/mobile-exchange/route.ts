import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Redis } from '@upstash/redis';
import * as jose from 'jose';
import crypto from 'crypto';
import { db } from '@/db';
import { linkedDevices } from '@/db/schema';
import { logAuditAction } from '@/lib/audit';
import { isGlobalAdmin } from '@/lib/auth/roles';
import { serverEnv } from '@/lib/env';

const redis = new Redis({
  url: serverEnv.UPSTASH_REDIS_REST_URL,
  token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
});

// A separate secret just for signing mobile companion app tokens
const MOBILE_SECRET = new TextEncoder().encode(
  serverEnv.MOBILE_JWT_SECRET || 'default-fallback-mobile-jwt-secret-key-32bytes-minimum-length-for-hs256'
);

export async function POST(req: Request) {
  const body = await req.json();
  const { token, linkToken: bodyLinkToken, deviceName, deviceOs, deviceModel } = body;
  const linkToken = token || bodyLinkToken;

  if (!linkToken) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  // 1. Fetch the user data from Upstash
  const redisKey = `qr_link:${linkToken}`;
  const userData = await redis.get(redisKey);

  if (!userData) {
    return NextResponse.json({ error: 'QR Code expired or invalid' }, { status: 401 });
  }

  // 2. BURN THE TOKEN! Single-use only.
  await redis.del(redisKey);

  // 3. Set a claimed marker so the web dashboard can detect success.
  // This key lives for 120s — enough time for the polling to detect it.
  await redis.set(`qr_claimed:${linkToken}`, '1', { ex: 120 });

  // 4. Generate a unique JWT ID for revocation tracking
  const jti = crypto.randomBytes(16).toString('hex');

  // 5. Parse user data
  const user = typeof userData === 'string' ? JSON.parse(userData) : userData;

  // 6. RBAC: Final backstop — only a GlobalAdmin session may ever receive a mobile JWT.
  // This guards against any token minted before the generate-qr endpoint was hardened.
  if (!isGlobalAdmin(user.role)) {
    await logAuditAction({
      entityType: 'linked_devices',
      entityId: user.id,
      actionType: 'UNAUTHORIZED_MOBILE_EXCHANGE_ATTEMPT',
      performedById: user.id,
      newData: {
        attemptedByRole: user.role,
        reason: 'Non-admin user attempted to claim a mobile session token.',
      },
    });
    return NextResponse.json(
      { error: 'Forbidden: Only Global Administrators can link a mobile device.' },
      { status: 403 },
    );
  }

  // 7. Generate a long-lived JWT specifically for the mobile device
  const mobileJwt = await new jose.SignJWT({
    id: user.id,
    role: user.role,
    email: user.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setJti(jti)
    .setExpirationTime('30d') // Mobile sessions can last 30 days
    .sign(MOBILE_SECRET);

  // 8. Persist the device link in the database
  const resolvedDeviceName = deviceName || 'Unknown Device';
  await db.insert(linkedDevices).values({
    userId: user.id,
    deviceName: resolvedDeviceName,
    deviceOs: deviceOs || null,
    deviceModel: deviceModel || null,
    jwtId: jti,
    lastActiveAt: new Date(),
  });

  // 9. Audit log the device link event
  await logAuditAction({
    entityType: 'linked_devices',
    entityId: jti,
    actionType: 'DEVICE_LINKED',
    performedById: user.id,
    newData: {
      deviceName: resolvedDeviceName,
      deviceOs: deviceOs || null,
      deviceModel: deviceModel || null,
    },
  });

  revalidatePath('/settings/devices');
  revalidatePath('/(app-shell)/(management)/settings/devices');

  return NextResponse.json({ accessToken: mobileJwt });
}
