import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { markAllNotificationsAsRead } from '@/lib/notifications/services';

export async function PATCH() {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
