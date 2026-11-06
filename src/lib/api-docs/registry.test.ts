import { describe, expect, it } from 'vitest';
import { getOpenApiSpec } from './registry';
describe('mobile API documentation', () => {
  it('documents the actual scanner request and data envelope', () => {
    const operation = getOpenApiSpec().paths['/v1/scan']!.post!;
    expect(JSON.stringify(operation.requestBody)).toContain('assetTag');
    expect(JSON.stringify(operation.requestBody)).not.toContain('"barcode"');
    expect(JSON.stringify(operation.responses['200'])).toContain('"data"');
  });
  it('includes the existing companion workflows', () => {
    const paths = getOpenApiSpec().paths;
    for (const path of [
      '/v1/assets/my-assets',
      '/v1/assets/assignments/{id}/acknowledge',
      '/v1/dashboard/stats',
      '/v1/issues',
    ])
      expect(paths[path]).toBeDefined();
  });
});
