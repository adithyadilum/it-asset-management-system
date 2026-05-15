import { describe, it, expect } from 'vitest';
import { assetRegistrationSchema } from './asset-registration';

describe('assetRegistrationSchema', () => {
  const baseValidAsset = {
    pillar: 'IT & Digital',
    categoryId: 1,
    brandId: 1,
    modelId: 1,
    name: 'Test Asset',
    purchaseDate: '2023-10-01',
    basePrice: 1000,
    vendorId: 1,
  };

  it('should validate successfully for a valid hardware asset', () => {
    const result = assetRegistrationSchema.safeParse(baseValidAsset);
    expect(result.success).toBe(true);
  });

  it('should require licenseType and totalSeats for Software pillar', () => {
    const softwareAsset = {
      ...baseValidAsset,
      pillar: 'Software',
    };

    const result = assetRegistrationSchema.safeParse(softwareAsset);
    expect(result.success).toBe(false);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.licenseType).toContain('License type is required for software.');
      expect(fieldErrors.totalSeats).toContain('Total seats is required for software.');
    }
  });

  it('should validate successfully for a valid software asset with required fields', () => {
    const softwareAsset = {
      ...baseValidAsset,
      pillar: 'Software',
      licenseType: 'Subscription',
      totalSeats: 10,
    };

    const result = assetRegistrationSchema.safeParse(softwareAsset);
    expect(result.success).toBe(true);
  });
});
