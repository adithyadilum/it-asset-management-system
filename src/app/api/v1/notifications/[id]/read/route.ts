import { NextResponse } from 'next/server';
import { allowAnyRole, withAuth } from '@/lib/api/with-auth';
import { markNotificationAsRead } from '@/lib/notifications/services';

// `markNotificationAsRead` filters by the caller's own id, so ownership is
// enforced by the query rather than by role.
export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(
  allowAnyRole,
  async (_request, { params, user }) => {
    try {
      const { id } = await params;

      if (!id) {
        return NextResponse.json(
          { error: 'Notification ID is required' },
          { status: 400 }
        );
      }

      const updatedNotification = await markNotificationAsRead(id, user.id);

      if (!updatedNotification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Notification marked as read',
          data: updatedNotification,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('PATCH /api/v1/notifications/{id}/read error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
