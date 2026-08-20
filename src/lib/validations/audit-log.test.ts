import { describe, it, expect } from 'vitest';
import { auditLogQuerySchema } from '@/lib/validations/audit-log';

describe('auditLogQuerySchema', () => {
  it('defaults page to 1 when not provided', () => {
    const result = auditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it('defaults pageSize to 16 when not provided', () => {
    const result = auditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageSize).toBe(16);
    }
  });

  it('rejects page < 1', () => {
    const result = auditLogQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts page = 1', () => {
    const result = auditLogQuerySchema.safeParse({ page: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts large page numbers', () => {
    const result = auditLogQuerySchema.safeParse({ page: 9999 });
    expect(result.success).toBe(true);
  });

  it('rejects pageSize < 1', () => {
    const result = auditLogQuerySchema.safeParse({ pageSize: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects pageSize > 100', () => {
    const result = auditLogQuerySchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts pageSize = 100', () => {
    const result = auditLogQuerySchema.safeParse({ pageSize: 100 });
    expect(result.success).toBe(true);
  });

  it('coerces string page and pageSize to numbers', () => {
    const result = auditLogQuerySchema.safeParse({ page: '3', pageSize: '25' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(25);
    }
  });

  it('accepts valid filter with field, operator, value', () => {
    const result = auditLogQuerySchema.safeParse({
      filters: [{ field: 'Action Taken', operator: 'is', value: 'CREATE' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts multiple filters', () => {
    const result = auditLogQuerySchema.safeParse({
      filters: [
        { field: 'Action Taken', operator: 'is', value: 'CREATE' },
        { field: 'User', operator: 'is not', value: 'admin' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects filter with invalid field', () => {
    const result = auditLogQuerySchema.safeParse({
      filters: [{ field: 'Invalid Field', operator: 'is', value: 'test' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects filter with empty value', () => {
    const result = auditLogQuerySchema.safeParse({
      filters: [{ field: 'Action Taken', operator: 'is', value: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects filter with invalid operator', () => {
    const result = auditLogQuerySchema.safeParse({
      filters: [
        { field: 'Action Taken', operator: 'contains', value: 'CREATE' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts search string up to 500 chars', () => {
    const result = auditLogQuerySchema.safeParse({ search: 'x'.repeat(500) });
    expect(result.success).toBe(true);
  });

  it('rejects search string > 500 chars', () => {
    const result = auditLogQuerySchema.safeParse({ search: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from search', () => {
    const result = auditLogQuerySchema.safeParse({ search: '  test  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('test');
    }
  });

  it('accepts all valid field values', () => {
    const validFields = [
      'Action Taken',
      'User',
      'Target Entity',
      'IP Address',
      'Event Details',
    ];
    for (const field of validFields) {
      const result = auditLogQuerySchema.safeParse({
        filters: [{ field, operator: 'is', value: 'test' }],
      });
      expect(result.success).toBe(true);
    }
  });
});
