import { generateTemplateWorkbook } from '@/lib/bulk-import/generate-template';
import { db } from '@/db';
import { describe, it, expect, vi } from 'vitest';
import ExcelJS from 'exceljs';

vi.mock('@/db', () => ({
  db: {
    query: {
      categories: {
        findFirst: vi.fn(),
      },
      brands: {
        findMany: vi.fn(() => []),
      },
      models: {
        findMany: vi.fn(() => []),
      },
      locations: {
        findMany: vi.fn(() => []),
      },
      vendors: {
        findMany: vi.fn(() => []),
      },
      owners: {
        findMany: vi.fn(() => []),
      },
    },
  },
}));

describe('generateTemplateWorkbook', () => {
  it('throws an error if category is not found', async () => {
    vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce(undefined);
    await expect(generateTemplateWorkbook(1)).rejects.toThrow('Category not found or is inactive');
  });

  it('throws an error if category is inactive', async () => {
    vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({ isActive: false } as any);
    await expect(generateTemplateWorkbook(1)).rejects.toThrow('Category not found or is inactive');
  });

  it('generates a workbook for a category with no custom fields', async () => {
    vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({
      id: 1,
      name: 'Standard Category',
      isActive: true,
      customSchema: {},
    } as any);

    const { buffer, fileName } = await generateTemplateWorkbook(1);
    expect(fileName).toBe('standard-category-import-template.xlsx');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    expect(workbook.worksheets.length).toBe(2);
    const dataSheet = workbook.getWorksheet('Import Data');
    const refSheet = workbook.getWorksheet('Reference Data');
    
    expect(dataSheet).toBeDefined();
    expect(refSheet).toBeDefined();
    
    // Header should contain Vendor Name and Notes, but no custom fields
    const row = dataSheet?.getRow(1);
    const values = row?.values as string[];
    expect(values).toContain('Vendor Name');
    expect(values).toContain('Notes');
    // Ensure Notes is the last column
    expect(values[values.length - 1]).toBe('Notes');
  });

  it('generates a workbook for a category with multiple assetTracking fields', async () => {
    vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({
      id: 2,
      name: 'Laptops',
      isActive: true,
      customSchema: {
        assetTracking: [
          { fieldName: 'RAM Size', inputType: 'Number' },
          { fieldName: 'Touch Screen', inputType: 'Boolean' },
        ],
      },
    } as any);

    const { buffer } = await generateTemplateWorkbook(2);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const dataSheet = workbook.getWorksheet('Import Data');
    const row = dataSheet?.getRow(1);
    const values = row?.values as string[];
    
    expect(values).toContain('RAM Size');
    expect(values).toContain('Touch Screen');
    expect(values).toContain('Notes');
  });
});
