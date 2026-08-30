import { NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { allowAnyRole, withAuth } from '@/lib/api/with-auth';
import { getUnreadCount } from '@/lib/notifications/services';

// Scoped to the caller's own id.
export const GET = withAuth(allowAnyRole, async (_request, { user }) => {
  try {
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
});
