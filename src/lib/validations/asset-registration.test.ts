import { describe, it, expect } from 'vitest';
import { assetRegistrationSchema } from '@/lib/validations/asset-registration';

describe('assetRegistrationSchema', () => {
  const baseValidHardwareAsset = {
    pillar: 'Hardware',
    categoryId: 1,
    brandId: 1,
    modelId: 1,
    name: 'Test Hardware Asset',
    purchaseDate: '2023-10-01',
    basePrice: 1000,
    vendorId: 1,
    locationId: 5,
    ownerId: 2,
  };

  const baseValidSoftwareAsset = {
    pillar: 'Software',
    categoryId: 2,
    brandId: 3,
    modelId: 4,
    name: 'Test Software Asset',
    purchaseDate: '2023-11-01',
    basePrice: 500,
    vendorId: 2,
    licenseType: 'Subscription',
    billingCycle: 'Monthly',
    licenseExpiryDate: '2024-11-01',
    totalSeats: 10,
    ownerId: 2,
  };

  // ---------------------------------------------------------------------------
  // Core valid scenarios
  // ---------------------------------------------------------------------------

  it('validates a complete valid hardware asset', () => {
    const result = assetRegistrationSchema.safeParse(baseValidHardwareAsset);
    expect(result.success).toBe(true);
  });

  it('validates a complete valid software asset', () => {
    const result = assetRegistrationSchema.safeParse(baseValidSoftwareAsset);
    expect(result.success).toBe(true);
  });

  it('validates valid furniture asset (no location required)', () => {
    const furnitureAsset = {
      ...baseValidHardwareAsset,
      pillar: 'Office Furniture',
      locationId: undefined, // Optional for furniture
    };
    const result = assetRegistrationSchema.safeParse(furnitureAsset);
    expect(result.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // General field validations
  // ---------------------------------------------------------------------------

  it('rejects missing or empty name', () => {
    const noName = { ...baseValidHardwareAsset, name: '' };
    const missingName = { ...baseValidHardwareAsset, name: undefined };

    expect(assetRegistrationSchema.safeParse(noName).success).toBe(false);
    expect(assetRegistrationSchema.safeParse(missingName).success).toBe(false);
  });

  it('rejects invalid pillar', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidHardwareAsset,
      pillar: 'InvalidPillar',
    });
    expect(result.success).toBe(false);
  });

  it('accepts basePrice = 0', () => {
    const zeroPrice = { ...baseValidHardwareAsset, basePrice: 0 };
    expect(assetRegistrationSchema.safeParse(zeroPrice).success).toBe(true);
  });

  it('rejects basePrice < 0', () => {
    const negativePrice = { ...baseValidHardwareAsset, basePrice: -100 };
    expect(assetRegistrationSchema.safeParse(negativePrice).success).toBe(
      false
    );
  });

  it('rejects missing relations (category, brand, model)', () => {
    expect(
      assetRegistrationSchema.safeParse({
        ...baseValidHardwareAsset,
        categoryId: 0,
      }).success
    ).toBe(false);
    expect(
      assetRegistrationSchema.safeParse({
        ...baseValidHardwareAsset,
        brandId: 0,
      }).success
    ).toBe(false);
    expect(
      assetRegistrationSchema.safeParse({
        ...baseValidHardwareAsset,
        modelId: 0,
      }).success
    ).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Date validations
  // ---------------------------------------------------------------------------

  it('requires purchaseDate to be valid YYYY-MM-DD', () => {
    expect(
      assetRegistrationSchema.safeParse({
        ...baseValidHardwareAsset,
        purchaseDate: '2023-13-01',
      }).success
    ).toBe(false);
    expect(
      assetRegistrationSchema.safeParse({
        ...baseValidHardwareAsset,
        purchaseDate: 'not-a-date',
      }).success
    ).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Warranty / Optional Financials
  // ---------------------------------------------------------------------------

  it('accepts valid warrantyMonths', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidHardwareAsset,
      warrantyMonths: 36,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid warrantyMonths (<= 0)', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidHardwareAsset,
      warrantyMonths: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid warrantyMonths (> 120)', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidHardwareAsset,
      warrantyMonths: 121,
    });
    expect(result.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Software specific rules (Super-refinement)
  // ---------------------------------------------------------------------------

  it('rejects software missing licenseType', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidSoftwareAsset,
      licenseType: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.licenseType).toContain(
        'License type is required for software.'
      );
    }
  });

  it('rejects software missing totalSeats', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidSoftwareAsset,
      totalSeats: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.totalSeats).toContain(
        'Total seats is required for software.'
      );
    }
  });

  it('rejects software with invalid licenseType', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidSoftwareAsset,
      licenseType: 'InvalidLicense',
    });
    expect(result.success).toBe(false);
  });

  it('requires billing cycle and expiry date for subscription software', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidSoftwareAsset,
      billingCycle: undefined,
      licenseExpiryDate: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.billingCycle).toContain(
        'Billing cycle is required for subscription licenses.'
      );
      expect(result.error.flatten().fieldErrors.licenseExpiryDate).toContain(
        'Expiry date is required for subscription licenses.'
      );
    }
  });

  it('rejects perpetual software with an expiry date', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidSoftwareAsset,
      licenseType: 'Perpetual',
      billingCycle: undefined,
      licenseExpiryDate: '2024-11-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.licenseExpiryDate).toContain(
        'Perpetual licenses must not have an expiry date.'
      );
    }
  });

  it('accepts perpetual software without billing cycle or expiry date', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidSoftwareAsset,
      licenseType: 'Perpetual',
      billingCycle: undefined,
      licenseExpiryDate: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('requires free software to have zero cost', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidSoftwareAsset,
      licenseType: 'Open Source / Free',
      billingCycle: undefined,
      licenseExpiryDate: undefined,
      basePrice: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.basePrice).toContain(
        'Free software must have a total cost of 0.'
      );
    }
  });

  it('accepts free software with zero cost', () => {
    const result = assetRegistrationSchema.safeParse({
      ...baseValidSoftwareAsset,
      licenseType: 'Open Source / Free',
      billingCycle: undefined,
      licenseExpiryDate: undefined,
      basePrice: 0,
    });
    expect(result.success).toBe(true);
  });
});
