import { validateRows } from '@/lib/bulk-import/validate-rows';
import { MasterDataCache } from '@/lib/bulk-import/resolve-references';
import { describe, it, expect } from 'vitest';

describe('validateRows', () => {
  const mockCache: MasterDataCache = {
    brands: new Map([['lenovo', { id: 1, isActive: true }]]),
    models: new Map([
      ['thinkpad t14|1', { id: 1, brandId: 1, isActive: true }],
      ['inactive model|1', { id: 2, brandId: 1, isActive: false }],
    ]),
    locations: new Map([['hq', { id: 1, isActive: true }]]),
    vendors: new Map([['dell', { id: 1, isActive: true }]]),
    owners: new Map([['it dept', { id: 1, isActive: true }]]),
    serialNumbers: new Set(['existing-serial-123']),
  };

  const defaultCategory = {
    requiresSerial: true,
    customSchema: {
      assetTracking: [
        { fieldName: 'Memory', inputType: 'Number', isRequired: true },
        { fieldName: 'Is Remote', inputType: 'Boolean', isRequired: false },
      ],
    },
  };

  const validRow = {
    'Asset Name': 'My Laptop',
    'Serial Number': 'NEW-SERIAL-001',
    'Brand Name': 'Lenovo',
    'Model Name': 'ThinkPad T14',
    'Location Name': 'HQ',
    'Owner Name': 'IT Dept',
    Condition: 'New',
    'Purchase Date': '2023-01-01',
    'Base Price': '1000',
    Tax: '100',
    'Shipping Cost': '50',
    'Currency Code': 'USD',
    'Warranty Months': '12',
    'Vendor Name': 'Dell',
    Memory: '16',
    'Is Remote': 'Yes',
  };

  it('passes a fully valid row', () => {
    const result = validateRows([validRow], mockCache, defaultCategory);
    expect(result.success).toBe(true);
    expect(result.validRows?.length).toBe(1);
    expect(result.errorRows?.length).toBe(0);
  });

  describe('Stage 1: Structural Validation', () => {
    it('fails when a required field is missing', () => {
      const row = { ...validRow, 'Brand Name': '' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('STRUCTURAL');
      expect(result.errorRows?.[0].errorField).toBe('Brand Name');
    });

    it('fails when Serial Number is blank but category requires it', () => {
      const row = { ...validRow, 'Serial Number': '' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('STRUCTURAL');
      expect(result.errorRows?.[0].errorField).toBe('Serial Number');
    });
  });

  describe('Stage 2: Type Coercion', () => {
    it('fails when Base Price is not a number', () => {
      const row = { ...validRow, 'Base Price': 'abc' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('TYPE');
      expect(result.errorRows?.[0].errorField).toBe('Base Price');
    });

    it('fails when Purchase Date is invalid', () => {
      const row = { ...validRow, 'Purchase Date': 'not-a-date' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('TYPE');
      expect(result.errorRows?.[0].errorField).toBe('Purchase Date');
    });
  });

  describe('Stage 3: Referential Integrity', () => {
    it('fails when Brand Name does not exist', () => {
      const row = { ...validRow, 'Brand Name': 'Apple' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('REFERENTIAL');
      expect(result.errorRows?.[0].errorField).toBe('Brand Name');
    });

    it('fails when Model Name belongs to a different category / is missing', () => {
      const row = { ...validRow, 'Model Name': 'Unknown Model' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('REFERENTIAL');
      expect(result.errorRows?.[0].errorField).toBe('Model Name');
    });

    it('strips [BrandName] suffix from Model Name correctly', () => {
      const row = { ...validRow, 'Model Name': 'ThinkPad T14 [Lenovo]' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(true);
    });

    it('fails when vendor is inactive or non-existent', () => {
      const row = { ...validRow, 'Vendor Name': 'Ghost Inc' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('REFERENTIAL');
      expect(result.errorRows?.[0].errorField).toBe('Vendor Name');
    });
  });

  describe('Stage 4: Business Rules', () => {
    it('fails when Purchase Date is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const row = { ...validRow, 'Purchase Date': futureDate.toISOString().split('T')[0] };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('BUSINESS_RULE');
      expect(result.errorRows?.[0].errorField).toBe('Purchase Date');
    });

    it('fails when serial number already exists in DB', () => {
      const row = { ...validRow, 'Serial Number': 'existing-serial-123' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('BUSINESS_RULE');
      expect(result.errorRows?.[0].errorField).toBe('Serial Number');
    });

    it('rejects both rows on intra-batch duplicate detection', () => {
      const row1 = { ...validRow, 'Serial Number': 'BATCH-DUP' };
      const row2 = { ...validRow, 'Serial Number': 'BATCH-DUP', 'Asset Name': 'Second' };
      const result = validateRows([row1, row2], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.length).toBe(2);
      expect(result.errorRows?.[0].errorStage).toBe('BUSINESS_RULE');
      expect(result.errorRows?.[1].errorStage).toBe('BUSINESS_RULE');
      expect(result.errorRows?.[0].errorMessage).toMatch(/duplicated/i);
    });
  });

  describe('Stage 5: EAV Schema', () => {
    it('fails when a required EAV field is missing', () => {
      const row = { ...validRow, Memory: '' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('EAV_SCHEMA');
      expect(result.errorRows?.[0].errorField).toBe('Memory');
    });

    it('fails when a Number EAV field is non-numeric', () => {
      const row = { ...validRow, Memory: 'abc' };
      const result = validateRows([row], mockCache, defaultCategory);
      expect(result.success).toBe(false);
      expect(result.errorRows?.[0].errorStage).toBe('EAV_SCHEMA');
      expect(result.errorRows?.[0].errorField).toBe('Memory');
    });
  });
});
