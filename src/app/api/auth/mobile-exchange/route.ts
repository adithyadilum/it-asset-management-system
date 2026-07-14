import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Redis } from '@upstash/redis';
import * as jose from 'jose';
import crypto from 'crypto';
import { db } from '@/db';
import { linkedDevices, users } from '@/db/schema';
import { logAuditAction } from '@/lib/audit';
import { isGlobalAdmin } from '@/lib/auth/roles';
import { serverEnv } from '@/lib/env';
import { MOBILE_JWT_AUDIENCE, MOBILE_JWT_ISSUER } from '@/lib/auth/get-authenticated-user';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const redis = new Redis({
  url: serverEnv.UPSTASH_REDIS_REST_URL,
  token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
});

// A separate secret just for signing mobile companion app tokens
const MOBILE_SECRET = new TextEncoder().encode(
  serverEnv.MOBILE_JWT_SECRET
);

const exchangeSchema = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    linkToken: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
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

export async function POST(req: Request) {
  const parsed = exchangeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    );
  }
  const { token, linkToken: bodyLinkToken, deviceName, deviceOs, deviceModel } = parsed.data;
  const linkToken = token || bodyLinkToken;

  if (!linkToken) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  // 1. Fetch the user data from Upstash
  const redisKey = `qr_link:${linkToken}`;
  const userData = await redis.getdel(redisKey);

  if (!userData) {
    return NextResponse.json({ error: 'QR Code expired or invalid' }, { status: 401 });
  }

  // 2. BURN THE TOKEN! Single-use only.

  // 3. Set a claimed marker so the web dashboard can detect success.
  // This key lives for 120s — enough time for the polling to detect it.

  // 4. Generate a unique JWT ID for revocation tracking
  const jti = crypto.randomBytes(16).toString('hex');

  // 5. Parse user data
  const storedUser = pairingUserSchema.safeParse(
    typeof userData === 'string' ? JSON.parse(userData) : userData
  );
  if (!storedUser.success) {
    return NextResponse.json({ error: 'Invalid pairing record' }, { status: 401 });
  }
  const user = storedUser.data;
  const [currentUser] = await db
    .select({ id: users.id, email: users.email, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  // 6. RBAC: Final backstop — only a GlobalAdmin session may ever receive a mobile JWT.
  // This guards against any token minted before the generate-qr endpoint was hardened.
  if (!currentUser?.isActive || !isGlobalAdmin(currentUser.role)) {
    await logAuditAction({
      entityType: 'linked_devices',
      entityId: user.id,
      actionType: 'UNAUTHORIZED_MOBILE_EXCHANGE_ATTEMPT',
      performedById: user.id,
      newData: {
        attemptedByRole: currentUser?.role ?? user.role,
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

  // 8. Persist the device link in the database
  const resolvedDeviceName = deviceName || 'Unknown Device';
  await db.insert(linkedDevices).values({
    userId: currentUser.id,
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
    performedById: currentUser.id,
    newData: {
      deviceName: resolvedDeviceName,
      deviceOs: deviceOs || null,
      deviceModel: deviceModel || null,
    },
  });

  await redis.set(`qr_claimed:${linkToken}`, '1', { ex: 120 });

  revalidatePath('/settings/devices');
  revalidatePath('/(app-shell)/(management)/settings/devices');

  return NextResponse.json({ accessToken: mobileJwt });
}

