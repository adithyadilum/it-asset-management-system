import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  AssignmentServiceError,
  assignSingleAsset,
} from '@/lib/data/operations-assignments-repo';
import {
  canManageAssets,
  getAuthenticatedUser,
} from '@/lib/auth/get-authenticated-user';
import { isValidUuid } from '@/lib/auth/uuid';
import { assignAssetPayloadSchema } from '@/lib/validations/asset-assignment';

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
      message: 'Unexpected error while assigning asset.',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageAssets(currentUser.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const params = await context.params;
  const assetId = params.id;

  if (!isValidUuid(assetId)) {
    return NextResponse.json(
      { message: 'Invalid asset id.', code: 'INVALID_ASSET_ID' },
      { status: 422 }
    );
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

  const parseResult = assignAssetPayloadSchema.safeParse(payload);
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
    const result = await assignSingleAsset(
      {
        assetId,
        assignmentType: parseResult.data.assignmentType,
        targetId: parseResult.data.targetId,
        expectedReturnDate: parseResult.data.expectedReturnDate,
        notes: parseResult.data.notes,
      },
      currentUser.id
    );

    return NextResponse.json(
      {
        message: 'Asset assigned successfully.',
        assignedAssetIds: result.assignedAssetIds,
        assignedCount: result.assignedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
