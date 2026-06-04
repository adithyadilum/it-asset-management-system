import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';
import { getUserNotifications, getUserNotificationsCount } from '@/lib/notifications/services';

export async function GET(request?: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request
      ? request.nextUrl.searchParams
      : new URL('http://localhost/').searchParams;
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
    
    const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10, 100);
    const offset = Math.max(Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0, 0);

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
    console.error('GET /api/v1/notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
