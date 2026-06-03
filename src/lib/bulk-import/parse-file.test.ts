import { describe, it, expect } from 'vitest';
import { parseFile } from '@/lib/bulk-import/parse-file';

describe('parseFile', () => {
  it('rejects files larger than 10MB', async () => {
    const file = new File([new ArrayBuffer(11 * 1024 * 1024)], 'test.csv', { type: 'text/csv' });
    await expect(parseFile(file)).rejects.toThrow('File exceeds the maximum limit of 10MB');
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
