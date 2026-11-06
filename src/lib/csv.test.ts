import { describe, expect, it } from 'vitest';
import { collectLedgerPages, csvCell } from './csv';

describe('financial exports', () => {
  it('retrieves every bounded page rather than stopping at the first 1000 rows', async () => {
    const response = await collectLedgerPages(async (page) => ({
      data: Array.from(
        { length: page < 3 ? 1000 : 7 },
        (_, i) => (page - 1) * 1000 + i
      ),
      meta: { totalPages: 3 },
    }));
    expect(response.data).toHaveLength(2007);
    expect(new Set(response.data).size).toBe(2007);
  });
  it('escapes embedded quotes, newlines, and formula prefixes', () => {
    expect(csvCell('a"b\nc')).toBe('"a""b\nc"');
    expect(csvCell(' =HYPERLINK("x")')).toBe('"\' =HYPERLINK(""x"")"');
  });
});
