import { NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { allowAnyRole, withAuth } from '@/lib/api/with-auth';
import {
  getUserNotifications,
  getUserNotificationsCount,
} from '@/lib/notifications/services';

// Every notification read is scoped to the caller's own id, so all
// authenticated roles may call this.
export const GET = withAuth(allowAnyRole, async (request, { user }) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const rawOffset = parseInt(searchParams.get('offset') || '0', 10);

    const limit = Math.min(
      Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10,
      100
    );
    const offset = Math.max(
      Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0,
      0
    );

    const [notifications, total] = await Promise.all([
      getUserNotifications(user.id, limit, offset),
      getUserNotificationsCount(user.id),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: notifications,
        pagination: {
          limit,
          offset,
          total,
          returned: notifications.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error('GET /api/v1/notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
