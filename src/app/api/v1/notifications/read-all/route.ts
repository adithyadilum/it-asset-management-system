import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';
import { markAllNotificationsAsRead } from '@/lib/notifications/services';

export async function PATCH(request?: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await markAllNotificationsAsRead(user.id);

    return NextResponse.json(
      {
        success: true,
        message: 'All notifications marked as read',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/v1/notifications/read-all error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
