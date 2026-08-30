import { NextResponse } from 'next/server';
import { allowAnyRole, withAuth } from '@/lib/api/with-auth';
import { markAllNotificationsAsRead } from '@/lib/notifications/services';

// Scoped to the caller's own id.
export const PATCH = withAuth(allowAnyRole, async (_request, { user }) => {
  try {
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
});
