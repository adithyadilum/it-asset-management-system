import { describe, it, expect } from 'vitest';
import {
  assignAssetPayloadSchema,
  bulkAssignAssetsPayloadSchema,
  processReturnPayloadSchema,
  operationsAssignmentsQuerySchema,
} from '@/lib/validations/asset-assignment';

// Helper to generate a future date in YYYY-MM-DD
function futureDate(daysFromNow = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function pastDate(daysAgo = 7): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440001';

describe('assignAssetPayloadSchema', () => {
  const validUserPayload = {
    assignmentType: 'user' as const,
    targetId: VALID_UUID,
  };

  const validLocationPayload = {
    assignmentType: 'location' as const,
    targetId: 1,
  };

  it('accepts valid user assignment with UUID targetId', () => {
    const result = assignAssetPayloadSchema.safeParse(validUserPayload);
    expect(result.success).toBe(true);
  });

  it('accepts valid location assignment with numeric targetId', () => {
    const result = assignAssetPayloadSchema.safeParse(validLocationPayload);
    expect(result.success).toBe(true);
  });

  it('rejects invalid assignmentType', () => {
    const result = assignAssetPayloadSchema.safeParse({
      ...validUserPayload,
      assignmentType: 'department',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty targetId string', () => {
    const result = assignAssetPayloadSchema.safeParse({
      ...validUserPayload,
      targetId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative targetId number', () => {
    const result = assignAssetPayloadSchema.safeParse({
      ...validLocationPayload,
      targetId: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero targetId number', () => {
    const result = assignAssetPayloadSchema.safeParse({
      ...validLocationPayload,
      targetId: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts undefined expectedReturnDate (optional)', () => {
    const result = assignAssetPayloadSchema.safeParse({
      ...validUserPayload,
      expectedReturnDate: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid ISO-8601 date for expectedReturnDate', () => {
    const result = assignAssetPayloadSchema.safeParse({
      ...validUserPayload,
      expectedReturnDate: futureDate(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects expectedReturnDate in the past', () => {
    const result = assignAssetPayloadSchema.safeParse({
      ...validUserPayload,
      expectedReturnDate: pastDate(),
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed date string for expectedReturnDate', () => {
    const result = assignAssetPayloadSchema.safeParse({
      ...validUserPayload,
      expectedReturnDate: '2023/01/01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts undefined notes (optional)', () => {
    const result = assignAssetPayloadSchema.safeParse({
      ...validUserPayload,
      notes: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('rejects notes exceeding 2000 chars', () => {
    const result = assignAssetPayloadSchema.safeParse({
      ...validUserPayload,
      notes: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe('bulkAssignAssetsPayloadSchema', () => {
  const validBulkPayload = {
    assetIds: [VALID_UUID, VALID_UUID_2],
    assignmentType: 'user' as const,
    targetId: VALID_UUID,
  };

  it('requires at least one assetId', () => {
    const result = bulkAssignAssetsPayloadSchema.safeParse({
      ...validBulkPayload,
      assetIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID strings in assetIds', () => {
    const result = bulkAssignAssetsPayloadSchema.safeParse({
      ...validBulkPayload,
      assetIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts multiple valid UUIDs', () => {
    const result = bulkAssignAssetsPayloadSchema.safeParse(validBulkPayload);
    expect(result.success).toBe(true);
  });
});

describe('processReturnPayloadSchema', () => {
  const validReturn = {
    assetId: VALID_UUID,
    condition: 'Good Working Condition' as const,
    physicalCondition: 'Excellent' as const,
  };

  it('requires a valid UUID assetId', () => {
    const result = processReturnPayloadSchema.safeParse(validReturn);
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID assetId', () => {
    const result = processReturnPayloadSchema.safeParse({
      ...validReturn,
      assetId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid condition values', () => {
    const conditions = [
      'Good Working Condition',
      'Minor Issues',
      'Needs Repair',
      'Beyond Repair',
    ];
    for (const condition of conditions) {
      const result = processReturnPayloadSchema.safeParse({
        ...validReturn,
        condition,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid condition values', () => {
    const result = processReturnPayloadSchema.safeParse({
      ...validReturn,
      condition: 'Destroyed',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional notes string', () => {
    const result = processReturnPayloadSchema.safeParse({
      ...validReturn,
      notes: 'Some notes about the return',
    });
    expect(result.success).toBe(true);
  });
});

describe('operationsAssignmentsQuerySchema', () => {
  it('accepts valid tab values', () => {
    for (const tab of ['available', 'assigned', 'returned']) {
      const result = operationsAssignmentsQuerySchema.safeParse({ tab });
      expect(result.success).toBe(true);
    }
  });

  it('accepts undefined tab (optional)', () => {
    const result = operationsAssignmentsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid tab values', () => {
    const result = operationsAssignmentsQuerySchema.safeParse({
      tab: 'pending',
    });
    expect(result.success).toBe(false);
  });
});
