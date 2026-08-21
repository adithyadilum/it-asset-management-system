import { describe, it, expect } from 'vitest';
import {
  brandSchema,
  locationSchema,
  vendorSchema,
  ownerSchema,
  departmentSchema,
  deviceModelSchema,
  categorySchema,
  customStatusSchema,
} from '@/lib/validations/master-data';

// ---------------------------------------------------------------------------
// brandSchema
// ---------------------------------------------------------------------------

describe('brandSchema', () => {
  it('accepts a valid brand with name ≥ 2 chars', () => {
    const result = brandSchema.safeParse({ name: 'HP', isActive: true });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = brandSchema.safeParse({ name: 'A', isActive: true });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from name', () => {
    const result = brandSchema.safeParse({ name: '  Dell  ', isActive: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Dell');
    }
  });

  it('rejects when isActive is missing', () => {
    const result = brandSchema.safeParse({ name: 'HP' });
    expect(result.success).toBe(false);
  });

  it('rejects when name is empty after trimming', () => {
    const result = brandSchema.safeParse({ name: '   ', isActive: true });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// locationSchema
// ---------------------------------------------------------------------------

describe('locationSchema', () => {
  it('accepts a valid location', () => {
    const result = locationSchema.safeParse({
      name: 'HQ Office',
      type: 'HQ',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = locationSchema.safeParse({
      name: 'A',
      type: 'HQ',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid location type', () => {
    const result = locationSchema.safeParse({
      name: 'HQ Office',
      type: 'InvalidType',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional parentId as integer', () => {
    const result = locationSchema.safeParse({
      name: 'Floor 3',
      type: 'Floor',
      parentId: 5,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('coerces string parentId to number', () => {
    const result = locationSchema.safeParse({
      name: 'Floor 3',
      type: 'Floor',
      parentId: '5',
      isActive: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentId).toBe(5);
    }
  });

  it('treats empty string parentId as undefined', () => {
    const result = locationSchema.safeParse({
      name: 'Floor 3',
      type: 'Floor',
      parentId: '',
      isActive: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentId).toBeUndefined();
    }
  });

  it('treats null parentId as undefined', () => {
    const result = locationSchema.safeParse({
      name: 'Floor 3',
      type: 'Floor',
      parentId: null,
      isActive: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentId).toBeUndefined();
    }
  });

  it('rejects negative parentId', () => {
    const result = locationSchema.safeParse({
      name: 'Floor 3',
      type: 'Floor',
      parentId: -1,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// vendorSchema
// ---------------------------------------------------------------------------

describe('vendorSchema', () => {
  it('accepts a valid vendor with just company name', () => {
    const result = vendorSchema.safeParse({
      companyName: 'Dell Technologies',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects company name shorter than 2 chars', () => {
    const result = vendorSchema.safeParse({
      companyName: 'D',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = vendorSchema.safeParse({
      companyName: 'Dell',
      email: 'not-an-email',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid email', () => {
    const result = vendorSchema.safeParse({
      companyName: 'Dell',
      email: 'vendor@dell.com',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty string email (optional field)', () => {
    const result = vendorSchema.safeParse({
      companyName: 'Dell',
      email: '',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid website URL', () => {
    const result = vendorSchema.safeParse({
      companyName: 'Dell',
      website: 'not-a-url',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid website URL', () => {
    const result = vendorSchema.safeParse({
      companyName: 'Dell',
      website: 'https://dell.com',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('prepends https:// to website URLs missing protocol', () => {
    const result = vendorSchema.safeParse({
      companyName: 'LG',
      website: 'www.lg.com/us/business',
      isActive: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBe('https://www.lg.com/us/business');
    }
  });

  it('accepts empty string website (optional field)', () => {
    const result = vendorSchema.safeParse({
      companyName: 'Dell',
      website: '',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects phone > 50 chars', () => {
    const result = vendorSchema.safeParse({
      companyName: 'Dell',
      phone: 'x'.repeat(51),
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts phone ≤ 50 chars', () => {
    const result = vendorSchema.safeParse({
      companyName: 'Dell',
      phone: '+1-234-567-8901',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ownerSchema
// ---------------------------------------------------------------------------

describe('ownerSchema', () => {
  it('accepts a valid owner', () => {
    const result = ownerSchema.safeParse({
      companyName: 'TIQRI Corp',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = ownerSchema.safeParse({ companyName: 'T', isActive: true });
    expect(result.success).toBe(false);
  });

  it('rejects missing isActive', () => {
    const result = ownerSchema.safeParse({ companyName: 'TIQRI' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// departmentSchema
// ---------------------------------------------------------------------------

describe('departmentSchema', () => {
  it('accepts a valid department with all required fields', () => {
    const result = departmentSchema.safeParse({
      name: 'Engineering',
      shortCode: 'eng',
      costCenterId: 'CC-001',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('transforms shortCode to uppercase', () => {
    const result = departmentSchema.safeParse({
      name: 'Engineering',
      shortCode: 'eng',
      costCenterId: 'CC-001',
      isActive: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shortCode).toBe('ENG');
    }
  });

  it('rejects name shorter than 2 chars', () => {
    const result = departmentSchema.safeParse({
      name: 'E',
      shortCode: 'ENG',
      costCenterId: 'CC-001',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects shortCode > 50 chars', () => {
    const result = departmentSchema.safeParse({
      name: 'Engineering',
      shortCode: 'A'.repeat(51),
      costCenterId: 'CC-001',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty shortCode', () => {
    const result = departmentSchema.safeParse({
      name: 'Engineering',
      shortCode: '',
      costCenterId: 'CC-001',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects costCenterId shorter than 2 chars', () => {
    const result = departmentSchema.safeParse({
      name: 'Engineering',
      shortCode: 'ENG',
      costCenterId: 'C',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deviceModelSchema
// ---------------------------------------------------------------------------

describe('deviceModelSchema', () => {
  const validTechnicalDetails = JSON.stringify({
    CPU: 'Intel i7',
    RAM: '16GB',
  });

  it('accepts a valid device model', () => {
    const result = deviceModelSchema.safeParse({
      name: 'ThinkPad X1 Carbon',
      brandId: 1,
      categoryId: 1,
      technicalDetails: validTechnicalDetails,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = deviceModelSchema.safeParse({
      name: 'T',
      brandId: 1,
      categoryId: 1,
      technicalDetails: validTechnicalDetails,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('coerces brandId and categoryId to positive integers', () => {
    const result = deviceModelSchema.safeParse({
      name: 'Model X',
      brandId: '3',
      categoryId: '5',
      technicalDetails: validTechnicalDetails,
      isActive: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brandId).toBe(3);
      expect(result.data.categoryId).toBe(5);
    }
  });

  it('rejects zero brandId', () => {
    const result = deviceModelSchema.safeParse({
      name: 'Model X',
      brandId: 0,
      categoryId: 1,
      technicalDetails: validTechnicalDetails,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative categoryId', () => {
    const result = deviceModelSchema.safeParse({
      name: 'Model X',
      brandId: 1,
      categoryId: -1,
      technicalDetails: validTechnicalDetails,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid technicalDetails JSON', () => {
    const result = deviceModelSchema.safeParse({
      name: 'Model X',
      brandId: 1,
      categoryId: 1,
      technicalDetails: 'not-json',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects technicalDetails with empty key', () => {
    const result = deviceModelSchema.safeParse({
      name: 'Model X',
      brandId: 1,
      categoryId: 1,
      technicalDetails: JSON.stringify({ '': 'value' }),
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects technicalDetails with empty value', () => {
    const result = deviceModelSchema.safeParse({
      name: 'Model X',
      brandId: 1,
      categoryId: 1,
      technicalDetails: JSON.stringify({ key: '   ' }),
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional valid imageUrl', () => {
    const result = deviceModelSchema.safeParse({
      name: 'Model X',
      brandId: 1,
      categoryId: 1,
      technicalDetails: validTechnicalDetails,
      imageUrl: 'https://example.com/img.png',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty string imageUrl', () => {
    const result = deviceModelSchema.safeParse({
      name: 'Model X',
      brandId: 1,
      categoryId: 1,
      technicalDetails: validTechnicalDetails,
      imageUrl: '',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid imageUrl', () => {
    const result = deviceModelSchema.safeParse({
      name: 'Model X',
      brandId: 1,
      categoryId: 1,
      technicalDetails: validTechnicalDetails,
      imageUrl: 'not-a-url',
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// categorySchema
// ---------------------------------------------------------------------------

describe('categorySchema', () => {
  const validCustomSchema = JSON.stringify({
    modelSpecs: [{ fieldName: 'Processor', inputType: 'Text', required: true }],
    assetTracking: [],
  });

  it('accepts a valid category', () => {
    const result = categorySchema.safeParse({
      pillar: 'Hardware',
      name: 'Laptops',
      prefix: 'LAP',
      customSchema: validCustomSchema,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid pillar value', () => {
    const result = categorySchema.safeParse({
      pillar: 'InvalidPillar',
      name: 'Laptops',
      prefix: 'LAP',
      customSchema: validCustomSchema,
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid pillar values', () => {
    for (const pillar of [
      'Hardware',
      'Software',
      'Office Furniture',
      'Office Electronics',
    ]) {
      const result = categorySchema.safeParse({
        pillar,
        name: 'Test',
        prefix: 'TST',
        customSchema: validCustomSchema,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects name shorter than 2 chars', () => {
    const result = categorySchema.safeParse({
      pillar: 'Hardware',
      name: 'L',
      prefix: 'LAP',
      customSchema: validCustomSchema,
    });
    expect(result.success).toBe(false);
  });

  it('requires prefix to be exactly 3 alphanumeric characters', () => {
    expect(
      categorySchema.safeParse({
        pillar: 'Hardware',
        name: 'Laptops',
        prefix: 'LA',
        customSchema: validCustomSchema,
      }).success
    ).toBe(false);

    expect(
      categorySchema.safeParse({
        pillar: 'Hardware',
        name: 'Laptops',
        prefix: 'LAPT',
        customSchema: validCustomSchema,
      }).success
    ).toBe(false);

    expect(
      categorySchema.safeParse({
        pillar: 'Hardware',
        name: 'Laptops',
        prefix: 'L@P',
        customSchema: validCustomSchema,
      }).success
    ).toBe(false);
  });

  it('transforms prefix to uppercase', () => {
    const result = categorySchema.safeParse({
      pillar: 'Hardware',
      name: 'Laptops',
      prefix: 'lap',
      customSchema: validCustomSchema,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prefix).toBe('LAP');
    }
  });

  it('rejects invalid customSchema JSON', () => {
    const result = categorySchema.safeParse({
      pillar: 'Hardware',
      name: 'Laptops',
      prefix: 'LAP',
      customSchema: 'not json',
    });
    expect(result.success).toBe(false);
  });

  it('rejects customSchema missing modelSpecs', () => {
    const result = categorySchema.safeParse({
      pillar: 'Hardware',
      name: 'Laptops',
      prefix: 'LAP',
      customSchema: JSON.stringify({ assetTracking: [] }),
    });
    expect(result.success).toBe(false);
  });

  it('validates customSchema structure (modelSpecs array, assetTracking array)', () => {
    const validResult = categorySchema.safeParse({
      pillar: 'Hardware',
      name: 'Laptops',
      prefix: 'LAP',
      customSchema: JSON.stringify({
        modelSpecs: [],
        assetTracking: [],
      }),
    });
    expect(validResult.success).toBe(true);
  });

  it('rejects customSchema with extra unexpected keys (strict mode)', () => {
    const result = categorySchema.safeParse({
      pillar: 'Hardware',
      name: 'Laptops',
      prefix: 'LAP',
      customSchema: JSON.stringify({
        modelSpecs: [],
        assetTracking: [],
        extraKey: 'invalid',
      }),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// customStatusSchema
// ---------------------------------------------------------------------------

describe('customStatusSchema', () => {
  it('accepts valid status with all required fields', () => {
    const result = customStatusSchema.safeParse({
      name: 'Pending Review',
      iconName: 'Clock',
      colorTheme: 'blue',
      isActive: true,
      allowedActions: '["edit", "delete"]',
    });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = customStatusSchema.safeParse({
      name: 'P',
      iconName: 'Clock',
      colorTheme: 'blue',
      isActive: true,
      allowedActions: '["edit", "delete"]',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty iconName', () => {
    const result = customStatusSchema.safeParse({
      name: 'Pending Review',
      iconName: '',
      colorTheme: 'blue',
      isActive: true,
      allowedActions: '["edit", "delete"]',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty colorTheme', () => {
    const result = customStatusSchema.safeParse({
      name: 'Pending Review',
      iconName: 'Clock',
      colorTheme: '',
      isActive: true,
      allowedActions: '["edit", "delete"]',
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from name', () => {
    const result = customStatusSchema.safeParse({
      name: '  Custom Status  ',
      iconName: 'Activity',
      colorTheme: 'green',
      isActive: false,
      allowedActions: '["edit", "delete"]',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Custom Status');
    }
  });
});
