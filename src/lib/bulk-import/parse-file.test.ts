import { describe, it, expect } from 'vitest';
import { parseFile } from '@/lib/bulk-import/parse-file';
import { MAX_IMPORT_FILE_BYTES, MAX_IMPORT_FILE_LABEL } from '@/lib/constants';

describe('parseFile', () => {
  it('rejects files above the import ceiling', async () => {
    const file = new File(
      [new ArrayBuffer(MAX_IMPORT_FILE_BYTES + 1024)],
      'test.csv',
      { type: 'text/csv' }
    );
    await expect(parseFile(file)).rejects.toThrow(
      `File exceeds the maximum limit of ${MAX_IMPORT_FILE_LABEL}`
    );
  });

  it('keeps the import ceiling under the Server Action body limit', () => {
    // next.config.ts sets serverActions.bodySizeLimit to 5mb. A ceiling at or
    // above that is unreachable — the request is rejected before validation runs.
    expect(MAX_IMPORT_FILE_BYTES).toBeLessThan(5 * 1024 * 1024);
  });

  it('rejects unsupported file types', async () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    await expect(parseFile(file)).rejects.toThrow('Invalid file type');
  });

  it('successfully parses a valid CSV', async () => {
    const csvContent = `Name,Price\nLaptop,1000\nMouse,50`;
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    const result = await parseFile(file);
    expect(result.headers).toEqual(['Name', 'Price']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].Name).toBe('Laptop');
    expect(result.skippedEmptyRows).toBe(0);
  });

  it('skips empty rows in CSV', async () => {
    const csvContent = `Name,Price\nLaptop,1000\n\nMouse,50\n  ,  \n`;
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    const result = await parseFile(file);
    expect(result.rows).toHaveLength(2);
    expect(result.skippedEmptyRows).toBeGreaterThan(0);
  });
});
