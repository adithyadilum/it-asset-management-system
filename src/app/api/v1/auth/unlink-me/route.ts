import { serverEnv } from '@/lib/env';
import { clientEnv } from '@/lib/env.client';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { linkedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditAction } from '@/lib/audit';
import Pusher from 'pusher';
import * as jose from 'jose';

const MOBILE_SECRET = new TextEncoder().encode(
  serverEnv.MOBILE_JWT_SECRET
);

export async function POST(req: Request) {
  // 1. Extract Bearer Token
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  let userId = null;
  let jti = null;

  try {
    const { payload } = await jose.jwtVerify(token, MOBILE_SECRET);
    userId = payload.id;
    jti = payload.jti;
  } catch {
    return NextResponse.json({ error: 'Invalid or Expired Mobile Token' }, { status: 401 });
  }

  if (!userId || !jti) {
    return NextResponse.json({ error: 'Invalid Token Payload' }, { status: 401 });
  }

  // 2. Find the exact device using the JWT ID (jti)
  const [device] = await db
    .select()
    .from(linkedDevices)
    .where(
      and(
        eq(linkedDevices.jwtId, jti as string),
        eq(linkedDevices.isRevoked, false)
      )
    )
    .limit(1);

  if (!device) {
    // If already revoked or doesn't exist, we just return success anyway
    // so the mobile app can clear its local storage smoothly.
    return NextResponse.json({ success: true, message: 'Already unlinked' });
  }

  // 3. Soft-revoke the device in the DB
  await db
    .update(linkedDevices)
    .set({ isRevoked: true })
    .where(eq(linkedDevices.id, device.id));

  // 4. Trigger a Pusher event to update the Web UI
  try {
    const pusher = new Pusher({
      appId: serverEnv.PUSHER_APP_ID!,
      key: clientEnv.NEXT_PUBLIC_PUSHER_KEY!,
      secret: serverEnv.PUSHER_SECRET!,
      cluster: clientEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
    
    // Notify the user's web session that devices were updated
    await pusher.trigger(`user-${userId}`, 'devices_updated', {
      deviceId: device.id,
      action: 'removed'
    });
  } catch (error) {
    console.error('Failed to trigger Pusher devices_updated event:', error);
  }

  // 5. Audit Log
  await logAuditAction({
    entityType: 'linked_devices',
    entityId: jti as string,
    actionType: 'DEVICE_UNLINKED', // User initiated from mobile
    performedById: userId as string,
    oldData: {
      deviceName: device.deviceName,
      deviceOs: device.deviceOs,
      deviceModel: device.deviceModel,
      reason: 'User self-revoked from mobile device',
    },
  });

  return NextResponse.json({ success: true, message: 'Device successfully unlinked' });
}
