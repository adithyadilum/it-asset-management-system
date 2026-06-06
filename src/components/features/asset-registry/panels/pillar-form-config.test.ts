import { describe, it, expect } from 'vitest';
import { getPillarFormConfig } from './pillar-form-config';
import { type RegistrationPillarInput } from '@/lib/validations/asset-registration';

describe('getPillarFormConfig', () => {
  it('should return correct config for Hardware', () => {
    const config = getPillarFormConfig('Hardware');
    expect(config.panelTitle).toBe('Asset Registry');
    expect(config.panelDescription).toBe('Hardware');
    expect(config.showSerialNumber).toBe(true);
    expect(config.showLocationField).toBe(false);
    expect(config.showConditionField).toBe(false);
    expect(config.showSoftwareLicensingSection).toBe(false);
    expect(config.showCostPerSeat).toBe(false);
  });

  it('should return correct config for Software', () => {
    const config = getPillarFormConfig('Software');
    expect(config.panelTitle).toBe('Software Registry');
    expect(config.panelDescription).toBe('Software');
    expect(config.serialLabel).toBe('License Key :');
    expect(config.modelLabel).toBe('Product');
    expect(config.showSoftwareLicensingSection).toBe(true);
    expect(config.showCostPerSeat).toBe(true);
    expect(config.showSuccessTagDialog).toBe(false);
  });

  it('should return correct config for Office Furniture', () => {
    const config = getPillarFormConfig('Office Furniture');
    expect(config.panelTitle).toBe('Asset Registry');
    expect(config.showLocationField).toBe(true);
    expect(config.showConditionField).toBe(true);
    expect(config.defaultCondition).toBe('New');
    expect(config.showSoftwareLicensingSection).toBe(false);
  });

  it('should return correct config for Office Electronics', () => {
    const config = getPillarFormConfig('Office Electronics');
    expect(config.panelTitle).toBe('Asset Registry');
    expect(config.showLocationField).toBe(true);
    expect(config.showConditionField).toBe(true);
    expect(config.defaultCondition).toBe('New');
    expect(config.showSoftwareLicensingSection).toBe(false);
  });

  it('should fallback to Hardware config for unknown pillar', () => {
    const config = getPillarFormConfig('Unknown Pillar' as RegistrationPillarInput);
    expect(config.panelTitle).toBe('Asset Registry');
    expect(config.panelDescription).toBe('Hardware');
  });
});
