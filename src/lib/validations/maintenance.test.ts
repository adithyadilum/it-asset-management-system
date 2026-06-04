import { describe, it, expect } from 'vitest';
import {
  resolveIssueSchema,
  initiateVendorRepairSchema,
  completeRepairSchema,
} from '@/lib/validations/maintenance';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('resolveIssueSchema', () => {
  it('requires positive integer ticketId', () => {
    const result = resolveIssueSchema.safeParse({
      ticketId: 1,
      resolutionNote: 'Fixed the issue',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-positive ticketId', () => {
    const result = resolveIssueSchema.safeParse({
      ticketId: -1,
      resolutionNote: 'Fixed the issue',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero ticketId', () => {
    const result = resolveIssueSchema.safeParse({
      ticketId: 0,
      resolutionNote: 'Fixed the issue',
    });
    expect(result.success).toBe(false);
  });

  it('requires non-empty resolutionNote (after trim)', () => {
    const result = resolveIssueSchema.safeParse({
      ticketId: 1,
      resolutionNote: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects resolutionNote > 1000 chars', () => {
    const result = resolveIssueSchema.safeParse({
      ticketId: 1,
      resolutionNote: 'x'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from resolutionNote', () => {
    const result = resolveIssueSchema.safeParse({
      ticketId: 1,
      resolutionNote: '  Valid note  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.resolutionNote).toBe('Valid note');
    }
  });
});

describe('initiateVendorRepairSchema', () => {
  const validInput = {
    ticketId: 1,
    assetId: VALID_UUID,
    vendorId: '5',
  };

  it('requires positive integer ticketId', () => {
    const result = initiateVendorRepairSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('requires valid UUID assetId', () => {
    const result = initiateVendorRepairSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID assetId', () => {
    const result = initiateVendorRepairSchema.safeParse({
      ...validInput,
      assetId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('coerces string vendorId to positive integer', () => {
    const result = initiateVendorRepairSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vendorId).toBe(5);
    }
  });

  it('rejects non-positive vendorId', () => {
    const result = initiateVendorRepairSchema.safeParse({
      ...validInput,
      vendorId: '0',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional rmaNumber up to 100 chars', () => {
    const result = initiateVendorRepairSchema.safeParse({
      ...validInput,
      rmaNumber: 'RMA-12345',
    });
    expect(result.success).toBe(true);
  });

  it('rejects rmaNumber > 100 chars', () => {
    const result = initiateVendorRepairSchema.safeParse({
      ...validInput,
      rmaNumber: 'x'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from rmaNumber', () => {
    const result = initiateVendorRepairSchema.safeParse({
      ...validInput,
      rmaNumber: '  RMA-123  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rmaNumber).toBe('RMA-123');
    }
  });

  it('accepts optional non-negative estimatedCost', () => {
    const result = initiateVendorRepairSchema.safeParse({
      ...validInput,
      estimatedCost: '150.50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimatedCost).toBe(150.5);
    }
  });

  it('rejects negative estimatedCost', () => {
    const result = initiateVendorRepairSchema.safeParse({
      ...validInput,
      estimatedCost: '-10',
    });
    expect(result.success).toBe(false);
  });

  it('coerces string estimatedCost to number', () => {
    const result = initiateVendorRepairSchema.safeParse({
      ...validInput,
      estimatedCost: '200',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.estimatedCost).toBe('number');
    }
  });

  it('accepts optional YYYY-MM-DD expectedReturnDate', () => {
    const result = initiateVendorRepairSchema.safeParse({
      ...validInput,
      expectedReturnDate: '2025-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('rejects malformed expectedReturnDate', () => {
    const result = initiateVendorRepairSchema.safeParse({
      ...validInput,
      expectedReturnDate: '12/31/2025',
    });
    expect(result.success).toBe(false);
  });
});

describe('completeRepairSchema', () => {
  const validInput = {
    ticketId: 1,
    actualCost: '250.00',
    resolutionNotes: 'Replaced the motherboard',
    updateStatusTo: 'Available' as const,
  };

  it('requires positive integer ticketId', () => {
    const result = completeRepairSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('coerces string actualCost to non-negative number', () => {
    const result = completeRepairSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actualCost).toBe(250);
    }
  });

  it('rejects negative actualCost', () => {
    const result = completeRepairSchema.safeParse({
      ...validInput,
      actualCost: '-10',
    });
    expect(result.success).toBe(false);
  });

  it('requires non-empty resolutionNotes', () => {
    const result = completeRepairSchema.safeParse({
      ...validInput,
      resolutionNotes: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects resolutionNotes > 1000 chars', () => {
    const result = completeRepairSchema.safeParse({
      ...validInput,
      resolutionNotes: 'x'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts 'Available' for updateStatusTo", () => {
    const result = completeRepairSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts 'Disposed' for updateStatusTo", () => {
    const result = completeRepairSchema.safeParse({
      ...validInput,
      updateStatusTo: 'Disposed',
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid updateStatusTo value (e.g., 'In Repair')", () => {
    const result = completeRepairSchema.safeParse({
      ...validInput,
      updateStatusTo: 'In Repair',
    });
    expect(result.success).toBe(false);
  });
});
