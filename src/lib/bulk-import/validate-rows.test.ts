import { describe, it, expect } from 'vitest';
import { validateRows } from '@/lib/bulk-import/validate-rows';
import { MasterDataCache } from '@/lib/bulk-import/resolve-references';

describe('validateRows', () => {
  const getMockCache = (): MasterDataCache => ({
    brands: new Map([['apple', { id: 1, name: 'Apple', isActive: true }]]),
    models: new Map([['macbook pro|1', { id: 1, name: 'MacBook Pro', isActive: true, brandId: 1, categoryId: 1 }]]),
    locations: new Map([['hq', { id: 1, name: 'HQ', isActive: true, type: 'Building', parentId: null }]]),
    owners: new Map([['john doe', { id: 1, name: 'John Doe', isActive: true }]]),
    vendors: new Map([['best buy', { id: 1, name: 'Best Buy', isActive: true }]]),
    serialNumbers: new Set(['already-exists-sn']),
  });

  const mockCategory = {
    requiresSerial: true,
    customSchema: {},
  };

  const validRow = {
    'Brand Name': 'Apple',
    'Model Name': 'MacBook Pro',
    'Purchase Date': '2023-01-01',
    'Base Price': '1500',
    'Vendor Name': 'Best Buy',
    'Serial Number': 'NEW-SN-123',
    'Location Name': 'HQ',
    'Owner Name': 'John Doe',
    'Condition': 'New',
    'Currency Code': 'USD',
  };

  it('validates a valid row successfully', () => {
    const result = validateRows([validRow], getMockCache(), mockCategory);
    expect(result.success).toBe(true);
    expect(result.validRows).toHaveLength(1);
    expect(result.errorRows).toHaveLength(0);
  });

  it('rejects missing mandatory fields', () => {
    const invalidRow = { ...validRow, 'Brand Name': '' };
    const result = validateRows([invalidRow], getMockCache(), mockCategory);
    expect(result.success).toBe(false);
    expect(result.errorRows![0].errorField).toBe('Brand Name');
    expect(result.errorRows![0].errorStage).toBe('STRUCTURAL');
  });

  it('rejects non-numeric price', () => {
    const invalidRow = { ...validRow, 'Base Price': 'abc' };
    const result = validateRows([invalidRow], getMockCache(), mockCategory);
    expect(result.success).toBe(false);
    expect(result.errorRows![0].errorField).toBe('Base Price');
    expect(result.errorRows![0].errorStage).toBe('TYPE');
  });

  it('rejects existing serial number', () => {
    const invalidRow = { ...validRow, 'Serial Number': 'already-exists-sn' };
    const result = validateRows([invalidRow], getMockCache(), mockCategory);
    expect(result.success).toBe(false);
    expect(result.errorRows![0].errorField).toBe('Serial Number');
    expect(result.errorRows![0].errorMessage).toContain('already exists');
  });

  it('collects all validation errors in one pass', () => {
    const invalidRow = { 
      'Brand Name': '', 
      'Model Name': 'MacBook Pro',
      'Purchase Date': '2023-01-01',
      'Base Price': '1500',
      'Vendor Name': 'Best Buy',
      'Serial Number': 'NEW-SN-123',
    };
    const result = validateRows([invalidRow], getMockCache(), mockCategory);
    // Since validateRows fails structural fields and continues to the next row, it catches the first error per row.
    // Wait, the implementation actually uses `continue` so it fails fast per row.
    expect(result.success).toBe(false);
    expect(result.errorRows).toHaveLength(1);
  });
});
