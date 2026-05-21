import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { getUserNotifications } from '@/lib/notifications/services';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const notifications = await getUserNotifications(
      user.id,
      limit,
      offset
    );

    return NextResponse.json(
      {
        success: true,
        data: notifications,
        pagination: {
          limit,
          offset,
          total: notifications.length,
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
