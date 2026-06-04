import { describe, it, expect } from 'vitest';
import {
  executeDisposalSchema,
  rejectDisposalSchema,
} from '@/lib/validations/disposals';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440001';

describe('executeDisposalSchema', () => {
  const validInput = {
    disposalIds: [1],
    assetIds: [VALID_UUID],
    reason: 'End of life',
    disposalMethod: 'E-waste' as const,
    dataWiped: true,
    tagsRemoved: true,
    receiptUrls: ['https://storage.example.com/receipt.pdf'],
  };

  it('requires at least one disposalId', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      disposalIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('coerces string disposalIds to positive integers', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      disposalIds: ['1', '2'],
      assetIds: [VALID_UUID, VALID_UUID_2],
    });
    expect(result.success).toBe(true);
  });

  it('requires at least one assetId', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      assetIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('validates assetIds as UUIDs', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      assetIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('requires non-empty reason', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      reason: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid ISO date for disposalDate', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      disposalDate: '2024-06-15',
    });
    expect(result.success).toBe(true);
  });

  it('accepts ISO datetime for disposalDate', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      disposalDate: '2024-06-15T10:30:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format for disposalDate', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      disposalDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('accepts undefined disposalDate (optional)', () => {
    const result = executeDisposalSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid disposalMethod values ('Sold', 'Stolen', 'E-waste', 'Donated')", () => {
    for (const method of ['Sold', 'Stolen', 'E-waste', 'Donated']) {
      const result = executeDisposalSchema.safeParse({
        ...validInput,
        disposalMethod: method,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid disposalMethod', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      disposalMethod: 'Recycled',
    });
    expect(result.success).toBe(false);
  });

  it('requires dataWiped to be true', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      dataWiped: true,
    });
    expect(result.success).toBe(true);
  });

  it('fails when dataWiped is false', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      dataWiped: false,
    });
    expect(result.success).toBe(false);
  });

  it('requires tagsRemoved to be true', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      tagsRemoved: true,
    });
    expect(result.success).toBe(true);
  });

  it('fails when tagsRemoved is false', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      tagsRemoved: false,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional non-negative actualSalvageValue', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      actualSalvageValue: 100,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative actualSalvageValue', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      actualSalvageValue: -50,
    });
    expect(result.success).toBe(false);
  });

  it('coerces string salvageValue to number', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      actualSalvageValue: '200',
    });
    expect(result.success).toBe(true);
  });

  it('requires at least one receipt URL (via receiptUrls)', () => {
    const result = executeDisposalSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('fails when neither receiptUrl nor receiptUrls provided', () => {
    const withoutReceipts = { ...validInput };
    delete (withoutReceipts as { receiptUrls?: unknown[] }).receiptUrls;
    const result = executeDisposalSchema.safeParse(withoutReceipts);
    expect(result.success).toBe(false);
  });

  it('normalizes single receiptUrl into receiptUrls array', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      receiptUrl: 'https://storage.example.com/single.pdf',
      receiptUrls: undefined,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.receiptUrls).toContain(
        'https://storage.example.com/single.pdf'
      );
    }
  });

  it('validates each receiptUrl is a valid URL', () => {
    const result = executeDisposalSchema.safeParse({
      ...validInput,
      receiptUrls: ['not-a-url'],
    });
    expect(result.success).toBe(false);
  });
});

describe('rejectDisposalSchema', () => {
  const validInput = {
    disposalIds: [1],
    assetIds: [VALID_UUID],
    rejectionReason: 'Asset still has warranty remaining',
    fallbackStatus: 'Available' as const,
  };

  it('requires at least one disposalId', () => {
    const result = rejectDisposalSchema.safeParse({
      ...validInput,
      disposalIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('requires at least one assetId', () => {
    const result = rejectDisposalSchema.safeParse({
      ...validInput,
      assetIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('requires rejectionReason ≥ 10 chars', () => {
    const result = rejectDisposalSchema.safeParse({
      ...validInput,
      rejectionReason: 'Too short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects rejectionReason > 1000 chars', () => {
    const result = rejectDisposalSchema.safeParse({
      ...validInput,
      rejectionReason: 'x'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from rejectionReason', () => {
    const result = rejectDisposalSchema.safeParse({
      ...validInput,
      rejectionReason: '   Still under warranty coverage   ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rejectionReason).toBe(
        'Still under warranty coverage'
      );
    }
  });

  it("accepts 'Available' for fallbackStatus", () => {
    const result = rejectDisposalSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts 'In Repair' for fallbackStatus", () => {
    const result = rejectDisposalSchema.safeParse({
      ...validInput,
      fallbackStatus: 'In Repair',
      maintenanceIssue: 'Needs screen replacement',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid fallbackStatus values', () => {
    const result = rejectDisposalSchema.safeParse({
      ...validInput,
      fallbackStatus: 'Disposed',
    });
    expect(result.success).toBe(false);
  });

  it("requires maintenanceIssue when fallbackStatus is 'In Repair'", () => {
    const result = rejectDisposalSchema.safeParse({
      ...validInput,
      fallbackStatus: 'In Repair',
    });
    expect(result.success).toBe(false);
  });

  it("does NOT require maintenanceIssue when fallbackStatus is 'Available'", () => {
    const result = rejectDisposalSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty maintenanceIssue when fallbackStatus is 'In Repair'", () => {
    const result = rejectDisposalSchema.safeParse({
      ...validInput,
      fallbackStatus: 'In Repair',
      maintenanceIssue: '   ',
    });
    expect(result.success).toBe(false);
  });
});
