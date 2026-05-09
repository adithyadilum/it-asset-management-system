import { preloadMasterDataCache } from '@/lib/bulk-import/resolve-references';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([
          { id: 1, name: 'Model A', brandId: 1, isActive: true },
        ])),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        then: function (resolve: any) {
          resolve([{ id: 1, name: 'Item', isActive: true }]);
        },
      })),
    })),
  },
}));

describe('preloadMasterDataCache', () => {
  it('loads caches successfully', async () => {
    // The query builder chain above will resolve arrays of dummy objects for each Promise.all call
    const cache = await preloadMasterDataCache(1);
    
    expect(cache).toBeDefined();
    expect(cache.brands).toBeInstanceOf(Map);
    expect(cache.models).toBeInstanceOf(Map);
    expect(cache.locations).toBeInstanceOf(Map);
    expect(cache.vendors).toBeInstanceOf(Map);
    expect(cache.owners).toBeInstanceOf(Map);
    expect(cache.serialNumbers).toBeInstanceOf(Set);
  });
});
