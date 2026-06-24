import { NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';

import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { getPortalAlerts } from '@/lib/data/portal-repo';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'Employee') {
      return NextResponse.json(
        { error: 'Forbidden: Employee role required' },
        { status: 403 }
      );
    }

    const alerts = await getPortalAlerts(user.id);

    return NextResponse.json(
      {
        success: true,
        data: alerts,
      },
      { status: 200 }
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error('GET /api/v1/portal/notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
