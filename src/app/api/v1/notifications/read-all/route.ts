//src/app/api/v1/notifications/read-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { markAllNotificationsAsRead } from '@/lib/notifications/services';

export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Mark all notifications as read
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