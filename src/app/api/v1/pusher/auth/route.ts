import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { linkedDevices } from '@/db/schema';
import { allowAnyRole, withAuth } from '@/lib/api/with-auth';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { getPusherServerClient } from '@/lib/pusher-server';

/**
 * Pusher private-channel authorization.
 *
 * Public channels require no subscription authorization, so anyone holding the
 * (necessarily public) app key could subscribe to `user-<id>` and receive that
 * user's scanned barcodes, or to `device-<jti>` and observe revocation events.
 * Private channels route every subscription through this endpoint instead.
 *
 * Two channel families are authorized:
 *   private-user-<userId>  — the caller's own id, and only their own
 *   private-device-<jti>   — a non-revoked device the caller owns
 *
 * The device check is a database lookup rather than a token-claim comparison,
 * so it works identically for a web session and a mobile bearer token, and a
 * revoked device stops being able to subscribe immediately.
 */
async function ownsDevice(userId: string, jwtId: string): Promise<boolean> {
  const [device] = await db
    .select({ id: linkedDevices.id })
    .from(linkedDevices)
    .where(
      and(
        eq(linkedDevices.jwtId, jwtId),
        eq(linkedDevices.userId, userId),
        eq(linkedDevices.isRevoked, false)
      )
    )
    .limit(1);

  return Boolean(device);
}

async function isChannelPermitted(
  channelName: string,
  userId: string
): Promise<boolean> {
  const userChannel = channelName.match(/^private-user-(.+)$/);
  if (userChannel) {
    return userChannel[1] === userId;
  }

  const deviceChannel = channelName.match(/^private-device-([a-f0-9]{32})$/i);
  if (deviceChannel) {
    return ownsDevice(userId, deviceChannel[1]);
  }

  return false;
}

export const POST = withRateLimit(
  'pusher-auth',
  withAuth(allowAnyRole, async (request, { user }) => {
    const pusher = getPusherServerClient();
    if (!pusher) {
      return NextResponse.json(
        { error: 'Realtime delivery is not configured' },
        { status: 503 }
      );
    }

    // Pusher posts `socket_id` and `channel_name` as form-encoded fields.
    const form = await request.formData().catch(() => null);
    const socketId = form?.get('socket_id');
    const channelName = form?.get('channel_name');

    if (typeof socketId !== 'string' || typeof channelName !== 'string') {
      return NextResponse.json(
        { error: 'socket_id and channel_name are required' },
        { status: 400 }
      );
    }

    if (!(await isChannelPermitted(channelName, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(pusher.authorizeChannel(socketId, channelName));
  })
);
