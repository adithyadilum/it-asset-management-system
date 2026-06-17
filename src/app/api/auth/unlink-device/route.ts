import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/db';
import { linkedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditAction } from '@/lib/audit';
import Pusher from 'pusher';
import { serverEnv } from '@/lib/env';
import { clientEnv } from '@/lib/env.client';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { deviceId } = await req.json();
  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
  }

  // Verify the device belongs to the requesting user (or they're a GlobalAdmin)
  const [device] = await db
    .select()
    .from(linkedDevices)
    .where(
      and(
        eq(linkedDevices.id, deviceId),
        eq(linkedDevices.isRevoked, false)
      )
    )
    .limit(1);

  if (!device) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  }

  // Only the device owner or a GlobalAdmin can unlink
  if (device.userId !== user.id && user.role !== 'GlobalAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Soft-revoke the device
  await db
    .update(linkedDevices)
    .set({ isRevoked: true })
    .where(eq(linkedDevices.id, deviceId));

  // Trigger real-time revocation event via Pusher
  try {
    const pusher = new Pusher({
      appId: serverEnv.PUSHER_APP_ID!,
      key: clientEnv.NEXT_PUBLIC_PUSHER_KEY!,
      secret: serverEnv.PUSHER_SECRET!,
      cluster: clientEnv.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
    await pusher.trigger(`device-${device.jwtId}`, 'device_unlinked', {
      message: 'Device revoked by admin',
    });
  } catch (error) {
    console.error('Failed to trigger Pusher revocation event:', error);
  }

  // Audit log
  await logAuditAction({
    entityType: 'linked_devices',
    entityId: device.jwtId,
    actionType: 'DEVICE_UNLINKED',
    performedById: user.id,
    oldData: {
      deviceName: device.deviceName,
      deviceOs: device.deviceOs,
      deviceModel: device.deviceModel,
    },
  });

  return NextResponse.json({ success: true, message: 'Device unlinked' });
}
