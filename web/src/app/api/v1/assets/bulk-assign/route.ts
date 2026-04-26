import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  AssignmentServiceError,
  assignMultipleAssets,
} from '@/lib/data/operations-assignments-repo';
import {
  canManageAssets,
  getAuthenticatedUser,
} from '@/lib/auth/get-authenticated-user';
import { bulkAssignAssetsPayloadSchema } from '@/lib/validations/asset-assignment';

function toErrorResponse(error: unknown) {
  if (error instanceof AssignmentServiceError) {
    return NextResponse.json(
      {
        message: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    {
      message: 'Unexpected error while assigning assets.',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

export async function POST(request: NextRequest) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageAssets(currentUser.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        message: 'Invalid JSON payload.',
        code: 'INVALID_PAYLOAD',
      },
      { status: 400 }
    );
  }

  const parseResult = bulkAssignAssetsPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: 'Validation failed.',
        code: 'VALIDATION_ERROR',
        issues: parseResult.error.issues,
      },
      { status: 422 }
    );
  }

  try {
    const result = await assignMultipleAssets(
      {
        assetIds: parseResult.data.assetIds,
        assignmentType: parseResult.data.assignmentType,
        targetId: parseResult.data.targetId,
        expectedReturnDate: parseResult.data.expectedReturnDate,
        notes: parseResult.data.notes,
      },
      currentUser.id
    );

    return NextResponse.json(
      {
        message: 'Assets assigned successfully.',
        assignedAssetIds: result.assignedAssetIds,
        assignedCount: result.assignedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
