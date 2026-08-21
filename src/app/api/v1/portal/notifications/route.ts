import { NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';

import { withSessionAuth } from '@/lib/api/with-auth';
import { isEmployee } from '@/lib/auth/roles';
import { getPortalAlerts } from '@/lib/data/portal-repo';

// The employee portal is the only surface that renders these alerts.
export const GET = withSessionAuth(isEmployee, async (_request, { user }) => {
  try {
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
});
