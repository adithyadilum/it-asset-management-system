import { NextResponse } from 'next/server';
import { db } from '@/db';
import { notificationRules } from '@/db/schema';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rules = await db
      .select()
      .from(notificationRules)
      .orderBy(notificationRules.id);

    return NextResponse.json(
      {
        success: true,
        data: rules,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/v1/settings/notification-rules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
