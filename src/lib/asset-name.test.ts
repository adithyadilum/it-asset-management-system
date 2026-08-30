import { describe, expect, it } from 'vitest';

import { formatAssetName } from '@/lib/asset-name';

describe('formatAssetName', () => {
  it('prefixes the brand when the model does not already carry it', () => {
    expect(formatAssetName('Dell', 'Latitude 5540')).toBe('Dell Latitude 5540');
  });

  it('leaves the model alone when it already leads with the brand', () => {
    expect(formatAssetName('Dell', 'Dell Latitude 5540')).toBe(
      'Dell Latitude 5540'
    );
  });

  it('matches the brand regardless of case', () => {
    expect(formatAssetName('DELL', 'dell latitude')).toBe('dell latitude');
  });

  it('falls back to the model when there is no brand', () => {
    expect(formatAssetName(null, 'Latitude 5540')).toBe('Latitude 5540');
  });
});
