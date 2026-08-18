import { NextResponse } from 'next/server';
import { allowAnyRole, withSessionAuth } from '@/lib/api/with-auth';
import { isGlobalAdmin } from '@/lib/auth/roles';
import { db } from '@/db';
import { linkedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditAction } from '@/lib/audit';
import { getPusherServerClient } from '@/lib/pusher-server';

// Authorization is per-object: any signed-in user may unlink a device they own,
// and a GlobalAdmin may unlink any device. The principal comes from the database
// rather than the session cookie, so a deactivated account cannot act here.
export const POST = withSessionAuth(allowAnyRole, async (req, { user }) => {
  const { deviceId } = await req.json();
  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
  }

  // Verify the device belongs to the requesting user (or they're a GlobalAdmin)
  const [device] = await db
    .select()
    .from(linkedDevices)
    .where(
      and(eq(linkedDevices.id, deviceId), eq(linkedDevices.isRevoked, false))
    )
    .limit(1);

  if (!device) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  }

  // Only the device owner or a GlobalAdmin can unlink
  if (device.userId !== user.id && !isGlobalAdmin(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Soft-revoke the device
  await db
    .update(linkedDevices)
    .set({ isRevoked: true })
    .where(eq(linkedDevices.id, deviceId));

  // Trigger real-time revocation event via Pusher
  try {
    await getPusherServerClient()?.trigger(
      `private-device-${device.jwtId}`,
      'device_unlinked',
      {
        message: 'Device revoked by admin',
      }
    );
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
});
