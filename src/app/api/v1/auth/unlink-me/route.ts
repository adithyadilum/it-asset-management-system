import { NextResponse } from 'next/server';
import { db } from '@/db';
import { linkedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditAction } from '@/lib/audit';
import { getPusherServerClient } from '@/lib/pusher-server';
import { withMobileAuth } from '@/lib/api/with-auth';
import { canAccessMobile } from '@/lib/auth/roles';

export const POST = withMobileAuth(canAccessMobile, async (_req, { user }) => {
  const userId = user.id;
  const jti = user.jwtId;

  // 2. Find the exact device using the JWT ID (jti)
  const [device] = await db
    .select()
    .from(linkedDevices)
    .where(
      and(eq(linkedDevices.jwtId, jti), eq(linkedDevices.isRevoked, false))
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
    // Notify the user's web session that devices were updated
    await getPusherServerClient()?.trigger(
      `user-${userId}`,
      'devices_updated',
      {
        deviceId: device.id,
        action: 'removed',
      }
    );
  } catch (error) {
    console.error('Failed to trigger Pusher devices_updated event:', error);
  }

  // 5. Audit Log
  await logAuditAction({
    entityType: 'linked_devices',
    entityId: jti,
    actionType: 'DEVICE_UNLINKED', // User initiated from mobile
    performedById: userId,
    oldData: {
      deviceName: device.deviceName,
      deviceOs: device.deviceOs,
      deviceModel: device.deviceModel,
      reason: 'User self-revoked from mobile device',
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Device successfully unlinked',
  });
});
