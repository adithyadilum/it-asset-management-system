import { withRateLimit } from '@/lib/api/with-rate-limit';
import { after, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import * as jose from 'jose';
import { db } from '@/db';
import { linkedDevices, users } from '@/db/schema';
import { logAuditAction } from '@/lib/audit';
import { canAccessMobile } from '@/lib/auth/roles';
import { serverEnv } from '@/lib/env';
import {
  MOBILE_JWT_AUDIENCE,
  MOBILE_JWT_ISSUER,
} from '@/lib/auth/get-authenticated-user';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createPairingStore, pairingDeviceId } from '@/lib/auth/pairing-store';
import { readDatabase } from '@/lib/database-recovery';

const redis = createPairingStore();

// A separate secret just for signing mobile companion app tokens
const MOBILE_SECRET = new TextEncoder().encode(serverEnv.MOBILE_JWT_SECRET);

const exchangeSchema = z
  .object({
    token: z
      .string()
      .regex(/^[a-f0-9]{64}$/i)
      .optional(),
    linkToken: z
      .string()
      .regex(/^[a-f0-9]{64}$/i)
      .optional(),
    deviceName: z.string().trim().min(1).max(255).optional(),
    deviceOs: z.string().trim().max(100).optional(),
    deviceModel: z.string().trim().max(100).optional(),
  })
  .refine((value) => Boolean(value.token || value.linkToken), {
    message: 'Missing token',
  });

const pairingUserSchema = z.object({
  id: z.string().uuid(),
  role: z.string(),
  email: z.string().email(),
});

export const POST = withRateLimit('mobile-exchange', async (req: Request) => {
  const parsed = exchangeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    );
  }
  const {
    token,
    linkToken: bodyLinkToken,
    deviceName,
    deviceOs,
    deviceModel,
  } = parsed.data;
  const linkToken = token || bodyLinkToken;

  if (!linkToken) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    // Atomically consume the single-use pairing credential.
    const redisKey = `qr_link:${linkToken}`;
    const userData = await redis.getdel(redisKey);

    if (!userData) {
      return NextResponse.json(
        { error: 'QR Code expired or invalid' },
        { status: 401 }
      );
    }

    // The desktop confirms the persisted link, independently of Redis/auditing.
    const jti = pairingDeviceId(linkToken);

    // Validate the stored identity and recheck its current access.
    const storedUser = pairingUserSchema.safeParse(
      typeof userData === 'string' ? JSON.parse(userData) : userData
    );
    if (!storedUser.success) {
      return NextResponse.json(
        { error: 'Invalid pairing record' },
        { status: 401 }
      );
    }
    const user = storedUser.data;
    const [currentUser] = await readDatabase(() =>
      db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)
    );

    // Only an asset-management role may receive a mobile JWT.
    // This guards against any token minted before the generate-qr endpoint was hardened.
    if (!currentUser?.isActive || !canAccessMobile(currentUser.role)) {
      after(() =>
        logAuditAction({
          entityType: 'linked_devices',
          entityId: user.id,
          actionType: 'UNAUTHORIZED_MOBILE_EXCHANGE_ATTEMPT',
          performedById: user.id,
          newData: {
            attemptedByRole: currentUser?.role ?? user.role,
            reason:
              'An unauthorized role attempted to claim a mobile session token.',
          },
        })
      );
      return NextResponse.json(
        {
          error:
            'Forbidden: Only Global Administrators and IT Operators can link a mobile device.',
        },
        { status: 403 }
      );
    }

    // Generate a long-lived JWT specifically for the mobile device.
    const mobileJwt = await new jose.SignJWT({
      id: currentUser.id,
      role: currentUser.role,
      email: currentUser.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setJti(jti)
      .setIssuer(MOBILE_JWT_ISSUER)
      .setAudience(MOBILE_JWT_AUDIENCE)
      .setExpirationTime('30d') // Mobile sessions can last 30 days
      .sign(MOBILE_SECRET);

    // Persist the device link before returning its credentials.
    const resolvedDeviceName = deviceName || 'Unknown Device';
    await db.insert(linkedDevices).values({
      userId: currentUser.id,
      deviceName: resolvedDeviceName,
      deviceOs: deviceOs || null,
      deviceModel: deviceModel || null,
      jwtId: jti,
      lastActiveAt: new Date(),
    });

    // Keep the audit on the server's tracked lifecycle, after delivering the JWT.
    // A slow audit insert must not make the phone lose a completed device link.
    after(() =>
      logAuditAction({
        entityType: 'linked_devices',
        entityId: jti,
        actionType: 'DEVICE_LINKED',
        performedById: currentUser.id,
        newData: {
          deviceName: resolvedDeviceName,
          deviceOs: deviceOs || null,
          deviceModel: deviceModel || null,
        },
      })
    );

    revalidatePath('/settings/devices');
    revalidatePath('/(app-shell)/(management)/settings/devices');

    return NextResponse.json(
      { accessToken: mobileJwt },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    console.warn('[PAIRING] Device exchange could not finish.');
    return NextResponse.json(
      {
        error:
          'Pairing could not finish. Generate a new code on the computer and try again.',
      },
      {
        status: 503,
        headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
      }
    );
  }
});
