import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAssignmentsDashboardData } from '@/lib/data/operations-assignments-repo';
import {
  canManageAssets,
  getAuthenticatedUser,
} from '@/lib/auth/get-authenticated-user';
import {
  operationsAssignmentsQuerySchema,
} from '@/lib/validations/asset-assignment';

export async function GET(request: NextRequest) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageAssets(currentUser.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const queryParams = {
    tab: request.nextUrl.searchParams.get('tab') ?? undefined,
  };

  const queryResult = operationsAssignmentsQuerySchema.safeParse(queryParams);
  if (!queryResult.success) {
    return NextResponse.json(
      {
        message: 'Invalid query parameters.',
        issues: queryResult.error.issues,
      },
      { status: 422 }
    );
  }

  const dashboardData = await getAssignmentsDashboardData();
  const requestedTab = queryResult.data.tab;

  if (!requestedTab) {
    return NextResponse.json(dashboardData, { status: 200 });
  }

  if (requestedTab === 'available') {
    return NextResponse.json(
      {
        tab: requestedTab,
        data: dashboardData.available,
      },
      { status: 200 }
    );
  }

  if (requestedTab === 'assigned') {
    return NextResponse.json(
      {
        tab: requestedTab,
        data: dashboardData.assigned,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      tab: requestedTab,
      data: dashboardData.returned,
    },
    { status: 200 }
  );
}
