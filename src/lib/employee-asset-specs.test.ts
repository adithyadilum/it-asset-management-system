import { describe, expect, it } from 'vitest';
import { employeeAssetSpecs } from './employee-asset-specs';

describe('employee specification projection', () => {
  it('excludes unknown and sensitive fields even inside otherwise public objects', () => {
    expect(
      employeeAssetSpecs({
        RAM_GB: 16,
        touch_screen: false,
        licenseKey: 'secret-key',
        purchasePrice: 350000,
        admin_password: 'secret',
        cpu: { brand: 'Intel', model: 'i7', apiToken: 'secret' },
        ports: [{ usb: 2, password: 'secret' }],
        internalNotes: 'private',
        network: { ip: '10.0.0.1' },
      })
    ).toEqual({
      RAM_GB: 16,
      touch_screen: false,
      cpu: { brand: 'Intel', model: 'i7' },
      ports: [{ usb: 2 }],
    });
  });
  it('does not fabricate details when no safe specifications were recorded', () => {
    for (const record of [
      null,
      undefined,
      [],
      { license_key: 'secret' },
      'private',
    ])
      expect(employeeAssetSpecs(record)).toBeNull();
  });
});
