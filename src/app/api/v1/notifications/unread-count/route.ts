import { NextRequest, NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';
import { getUnreadCount } from '@/lib/notifications/services';

export async function GET(request?: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unreadCount = await getUnreadCount(user.id);

    return NextResponse.json(
      {
        success: true,
        unreadCount,
      },
      { status: 200 }
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error('GET /api/v1/notifications/unread-count error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
