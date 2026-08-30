import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import {
  ADMIN_USER,
  IT_OPERATOR_USER,
  FINANCE_AUDITOR_USER,
  EMPLOYEE_USER,
} from '@/test/fixtures/users';

// ---------------------------------------------------------------------------
// AUTH mock
// ---------------------------------------------------------------------------
const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
  enforceActionAccess: vi.fn(async (validator) => {
    const user = await mockGetAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');
    if (validator && !validator(user.role)) throw new Error('Forbidden');
    return user;
  }),
}));

// ---------------------------------------------------------------------------
// REPO mocks — assignments delegates heavily to the repo layer
// ---------------------------------------------------------------------------
const {
  mockAssignSingleAsset,
  mockAssignMultipleAssets,
  mockGetAssignmentsDashboardData,
  mockTriggerAssignmentReminders,
  mockTriggerReturnRequests,
  mockMarkAssignmentsAsReceived,
  mockProcessAssetReturn,
  mockCancelPendingAssignment,
  MockAssignmentServiceError,
} = vi.hoisted(() => {
  return {
    mockAssignSingleAsset: vi.fn(),
    mockAssignMultipleAssets: vi.fn(),
    mockGetAssignmentsDashboardData: vi.fn(),
    mockTriggerAssignmentReminders: vi.fn(),
    mockTriggerReturnRequests: vi.fn(),
    mockMarkAssignmentsAsReceived: vi.fn(),
    mockProcessAssetReturn: vi.fn(),
    mockCancelPendingAssignment: vi.fn(),
    MockAssignmentServiceError: class extends Error {
      code: string;
      statusCode: number;
      constructor(message: string, code: string, statusCode: number) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
      }
    },
  };
});

vi.mock('@/lib/data/operations-assignments-repo', () => ({
  assignSingleAsset: (...args: unknown[]) => mockAssignSingleAsset(...args),
  assignMultipleAssets: (...args: unknown[]) =>
    mockAssignMultipleAssets(...args),
  getAssignmentsDashboardData: (...args: unknown[]) =>
    mockGetAssignmentsDashboardData(...args),
  triggerAssignmentReminders: (...args: unknown[]) =>
    mockTriggerAssignmentReminders(...args),
  triggerReturnRequests: (...args: unknown[]) =>
    mockTriggerReturnRequests(...args),
  markAssignmentsAsReceived: (...args: unknown[]) =>
    mockMarkAssignmentsAsReceived(...args),
  processAssetReturn: (...args: unknown[]) => mockProcessAssetReturn(...args),
  cancelPendingAssignment: (...args: unknown[]) =>
    mockCancelPendingAssignment(...args),
  AssignmentServiceError: MockAssignmentServiceError,
}));

// ---------------------------------------------------------------------------
// Webhook & Next.js mocks
// ---------------------------------------------------------------------------
const mockDispatchWebhookEvent = vi.fn();
vi.mock('@/lib/webhooks/dispatcher', () => ({
  dispatchWebhookEvent: (...args: unknown[]) =>
    mockDispatchWebhookEvent(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: vi.fn().mockReturnValue(0),
  logLatency: vi.fn(),
  logError: vi.fn(),
}));

// ---------------------------------------------------------------------------
// IMPORT the actions under test AFTER all mocks
// ---------------------------------------------------------------------------
import {
  assignAssetAction,
  bulkAssignAssetsAction,
  getOperationsAssignmentsDataAction,
  sendAssignmentReminderAction,
  requestAssetReturnAction,
  markAssetReceivedAction,
  processAssetReturnAction,
  cancelAssignmentAction,
} from '@/actions/assignments';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440001';

// ---------------------------------------------------------------------------
// Helper: valid inputs
// ---------------------------------------------------------------------------
const validSingleInput = {
  assetId: VALID_UUID,
  assignmentType: 'user' as const,
  targetId: VALID_UUID_2,
};

const successResult = {
  assignedAssetIds: [VALID_UUID],
  assignedCount: 1,
  assignments: [{ assignmentId: 1, assetId: VALID_UUID }],
};

// ===================================
// EPIC 13: ASSET ASSIGNMENT
// ===================================

describe('assignAssetAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns forbidden when user is unauthenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await assignAssetAction(validSingleInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('returns forbidden when user is Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await assignAssetAction(validSingleInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('returns forbidden when user is FinancialAuditor', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(FINANCE_AUDITOR_USER);
    const result = await assignAssetAction(validSingleInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('allows GlobalAdmin role', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockAssignSingleAsset.mockResolvedValue(successResult);
    const result = await assignAssetAction(validSingleInput);
    expect(result.success).toBe(true);
  });

  it('allows ITOperator role', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    mockAssignSingleAsset.mockResolvedValue(successResult);
    const result = await assignAssetAction(validSingleInput);
    expect(result.success).toBe(true);
  });

  it('returns VALIDATION_ERROR for invalid assignmentType', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await assignAssetAction({
      ...validSingleInput,
      assignmentType: 'department' as 'user',
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR when targetId is empty string', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await assignAssetAction({
      ...validSingleInput,
      targetId: '',
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('successfully assigns single asset to user and revalidates paths', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockAssignSingleAsset.mockResolvedValue(successResult);
    const result = await assignAssetAction(validSingleInput);
    expect(result.success).toBe(true);
    expect(result.assignedAssetIds).toContain(VALID_UUID);
    expect(mockAssignSingleAsset).toHaveBeenCalledWith(
      validSingleInput,
      ADMIN_USER.id
    );
    expect(revalidatePath).toHaveBeenCalledWith('/operations/assignments');
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
  });

  it('returns normalized error for AssignmentServiceError', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockAssignSingleAsset.mockRejectedValue(
      new MockAssignmentServiceError(
        'Asset not available',
        'ASSET_NOT_AVAILABLE',
        409
      )
    );
    const result = await assignAssetAction(validSingleInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('ASSET_NOT_AVAILABLE');
    expect(result.statusCode).toBe(409);
  });

  it('returns INTERNAL_ERROR for unknown exceptions', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockAssignSingleAsset.mockRejectedValue(new Error('DB crash'));
    const result = await assignAssetAction(validSingleInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.statusCode).toBe(500);
  });
});

describe('bulkAssignAssetsAction', () => {
  const validBulkInput = {
    assetIds: [VALID_UUID, VALID_UUID_2],
    assignmentType: 'user' as const,
    targetId: VALID_UUID_2,
  };

  const bulkResult = {
    assignedAssetIds: [VALID_UUID, VALID_UUID_2],
    assignedCount: 2,
    assignments: [
      { assignmentId: 1, assetId: VALID_UUID },
      { assignmentId: 2, assetId: VALID_UUID_2 },
    ],
  };

  beforeEach(() => vi.clearAllMocks());

  it('returns forbidden when user is unauthenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await bulkAssignAssetsAction(validBulkInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('returns forbidden when user is Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await bulkAssignAssetsAction(validBulkInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('returns VALIDATION_ERROR for empty assetIds array', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await bulkAssignAssetsAction({
      ...validBulkInput,
      assetIds: [],
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for non-UUID assetIds', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await bulkAssignAssetsAction({
      ...validBulkInput,
      assetIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('successfully assigns multiple assets and revalidates', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockAssignMultipleAssets.mockResolvedValue(bulkResult);
    const result = await bulkAssignAssetsAction(validBulkInput);
    expect(result.success).toBe(true);
    expect(result.assignedCount).toBe(2);
    expect(revalidatePath).toHaveBeenCalledWith('/operations/assignments');
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
  });

  it('returns normalized error for service failures', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockAssignMultipleAssets.mockRejectedValue(
      new MockAssignmentServiceError(
        'Some assets not available',
        'PARTIAL_FAILURE',
        409
      )
    );
    const result = await bulkAssignAssetsAction(validBulkInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('PARTIAL_FAILURE');
  });
});

describe('getOperationsAssignmentsDataAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getOperationsAssignmentsDataAction()).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('throws for Employee role', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getOperationsAssignmentsDataAction()).rejects.toThrow(
      'Forbidden'
    );
  });

  it('returns dashboard data for admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const mockData = { available: [], assigned: [], returned: [] };
    mockGetAssignmentsDashboardData.mockResolvedValue(mockData);
    const result = await getOperationsAssignmentsDataAction();
    expect(result).toEqual(mockData);
  });
});

describe('sendAssignmentReminderAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns forbidden for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await sendAssignmentReminderAction([1, 2]);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('returns forbidden for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await sendAssignmentReminderAction([1, 2]);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('delegates to triggerAssignmentReminders', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockTriggerAssignmentReminders.mockResolvedValue(undefined);
    const result = await sendAssignmentReminderAction([1, 2]);
    expect(result.success).toBe(true);
    expect(mockTriggerAssignmentReminders).toHaveBeenCalledWith(
      [1, 2],
      ADMIN_USER.id
    );
    expect(revalidatePath).toHaveBeenCalledWith('/operations/assignments');
  });
});

// ===================================
// EPIC 14: ASSET RETURNS
// ===================================

describe('requestAssetReturnAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns forbidden when user is unauthenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await requestAssetReturnAction([1]);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('returns forbidden when user is Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await requestAssetReturnAction([1]);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('returns forbidden when user is FinancialAuditor', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(FINANCE_AUDITOR_USER);
    const result = await requestAssetReturnAction([1]);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('delegates to triggerReturnRequests with correct args', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockTriggerReturnRequests.mockResolvedValue(undefined);
    const result = await requestAssetReturnAction([1, 2]);
    expect(result.success).toBe(true);
    expect(mockTriggerReturnRequests).toHaveBeenCalledWith(
      [1, 2],
      ADMIN_USER.id
    );
    expect(revalidatePath).toHaveBeenCalledWith('/operations/assignments');
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
  });

  it('returns normalized error on service failure', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockTriggerReturnRequests.mockRejectedValue(
      new MockAssignmentServiceError('Not found', 'NOT_FOUND', 404)
    );
    const result = await requestAssetReturnAction([999]);
    expect(result.success).toBe(false);
    expect(result.code).toBe('NOT_FOUND');
  });
});

describe('markAssetReceivedAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns forbidden for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await markAssetReceivedAction([1]);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('returns forbidden for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await markAssetReceivedAction([1]);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('delegates to markAssignmentsAsReceived', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockMarkAssignmentsAsReceived.mockResolvedValue({
      assignments: [{ assignmentId: 1, assetId: VALID_UUID }],
    });
    const result = await markAssetReceivedAction([1]);
    expect(result.success).toBe(true);
    expect(mockMarkAssignmentsAsReceived).toHaveBeenCalledWith(
      [1],
      ADMIN_USER.id
    );
    expect(revalidatePath).toHaveBeenCalledWith('/operations/assignments');
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
  });

  it('dispatches webhook events for returned assignments', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockMarkAssignmentsAsReceived.mockResolvedValue({
      assignments: [{ assignmentId: 1, assetId: VALID_UUID }],
    });
    await markAssetReceivedAction([1]);
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      'assignment.returned',
      expect.objectContaining({ assignmentId: 1, assetId: VALID_UUID })
    );
  });

  it('does not dispatch webhook when result has no assignments', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockMarkAssignmentsAsReceived.mockResolvedValue({ assignments: [] });
    await markAssetReceivedAction([1]);
    expect(mockDispatchWebhookEvent).not.toHaveBeenCalled();
  });
});

describe('processAssetReturnAction', () => {
  const validInput = {
    assetId: VALID_UUID,
    condition: 'Good Working Condition' as const,
    physicalCondition: 'Excellent' as const,
    notes: 'Returned in great shape',
  };

  beforeEach(() => vi.clearAllMocks());

  it('returns forbidden for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await processAssetReturnAction(validInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('returns forbidden for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await processAssetReturnAction(validInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('successfully delegates to processAssetReturn with user ID', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockProcessAssetReturn.mockResolvedValue(undefined);
    const result = await processAssetReturnAction(validInput);
    expect(result.success).toBe(true);
    expect(mockProcessAssetReturn).toHaveBeenCalledWith(
      validInput,
      ADMIN_USER.id
    );
    expect(revalidatePath).toHaveBeenCalledWith('/operations/assignments');
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
  });

  it('returns normalized error on service failure', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockProcessAssetReturn.mockRejectedValue(
      new MockAssignmentServiceError(
        'Return already processed',
        'ALREADY_RETURNED',
        409
      )
    );
    const result = await processAssetReturnAction(validInput);
    expect(result.success).toBe(false);
    expect(result.code).toBe('ALREADY_RETURNED');
  });
});

describe('cancelAssignmentAction', () => {
  const ASSET_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockCancelPendingAssignment.mockReset();
    mockCancelPendingAssignment.mockResolvedValue({ assetId: ASSET_ID });
  });

  it('lets a GlobalAdmin cancel any pending assignment', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);

    const result = await cancelAssignmentAction(42);

    expect(result.success).toBe(true);
    // allowAnyInitiator is what lets an admin undo somebody else's mistake.
    expect(mockCancelPendingAssignment).toHaveBeenCalledWith(
      42,
      ADMIN_USER.id,
      { allowAnyInitiator: true }
    );
  });

  it('restricts an ITOperator to assignments they created', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);

    const result = await cancelAssignmentAction(42);

    expect(result.success).toBe(true);
    expect(mockCancelPendingAssignment).toHaveBeenCalledWith(
      42,
      IT_OPERATOR_USER.id,
      { allowAnyInitiator: false }
    );
  });

  it('refuses a role that cannot manage assets', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);

    const result = await cancelAssignmentAction(42);

    expect(result.success).toBe(false);
    expect(result.code).toBe('FORBIDDEN');
    expect(mockCancelPendingAssignment).not.toHaveBeenCalled();
  });

  it('refuses an unauthenticated caller', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const result = await cancelAssignmentAction(42);

    expect(result.success).toBe(false);
    expect(mockCancelPendingAssignment).not.toHaveBeenCalled();
  });

  it('surfaces the repo error when the assignment is no longer pending', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockCancelPendingAssignment.mockRejectedValue(
      new MockAssignmentServiceError(
        'Only an assignment still awaiting acknowledgment can be cancelled.',
        'ASSIGNMENT_NOT_PENDING',
        409
      )
    );

    const result = await cancelAssignmentAction(42);

    expect(result.success).toBe(false);
    expect(result.code).toBe('ASSIGNMENT_NOT_PENDING');
  });

  it('revalidates the screens that show the assignment', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);

    await cancelAssignmentAction(42);

    expect(revalidatePath).toHaveBeenCalledWith('/operations/assignments');
    expect(revalidatePath).toHaveBeenCalledWith(`/assets/${ASSET_ID}`);
  });
});
