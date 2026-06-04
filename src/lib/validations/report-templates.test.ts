import { describe, it, expect } from 'vitest';
import { reportTemplateSchema } from '@/lib/validations/report-templates';

describe('reportTemplateSchema', () => {
  const validData = {
    name: 'Hardware Inventory',
    description: 'All active hardware',
    isActive: true,
    dataSource: 'assets',
    filters: {
      status: 'Assigned',
    },
    fields: ['assetTag', 'name', 'status'],
    sortDirection: 'asc' as const,
  };

  it('validates a correct payload', () => {
    const result = reportTemplateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('requires a name', () => {
    const result = reportTemplateSchema.safeParse({ ...validData, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Report name is required.');
    }
  });

  it('rejects name over 255 chars', () => {
    const result = reportTemplateSchema.safeParse({ ...validData, name: 'a'.repeat(256) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Report name must be 255 characters or fewer.');
    }
  });

  it('requires a dataSource', () => {
    const result = reportTemplateSchema.safeParse({ ...validData, dataSource: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Primary data source is required.');
    }
  });

  it('requires at least one field', () => {
    const result = reportTemplateSchema.safeParse({ ...validData, fields: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('At least one report field must be selected.');
    }
  });

  it('rejects invalid sortDirection', () => {
    const result = reportTemplateSchema.safeParse({ ...validData, sortDirection: 'invalid' });
    expect(result.success).toBe(false);
  });
});
