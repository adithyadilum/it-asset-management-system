import { db } from '@/db';
import {
  brands,
  categories,
  locations,
  models,
  owners,
  vendors,
} from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';

export async function generateTemplateWorkbook(categoryId: number) {
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });

  if (!category || !category.isActive) {
    throw new Error('Category not found or is inactive');
  }

  const [
    activeBrands,
    activeModels,
    activeLocations,
    activeVendors,
    activeOwners,
  ] = await Promise.all([
    db.query.brands.findMany({
      where: eq(brands.isActive, true),
      orderBy: (brands, { asc }) => [asc(brands.name)],
    }),
    db.query.models.findMany({
      where: and(eq(models.categoryId, categoryId), eq(models.isActive, true)),
      with: { brand: true },
    }),
    db.query.locations.findMany({
      where: eq(locations.isActive, true),
      orderBy: (locations, { asc }) => [asc(locations.name)],
    }),
    db.query.vendors.findMany({
      where: eq(vendors.isActive, true),
      orderBy: (vendors, { asc }) => [asc(vendors.companyName)],
    }),
    db.query.owners.findMany({
      where: eq(owners.isActive, true),
      orderBy: (owners, { asc }) => [asc(owners.companyName)],
    }),
  ]);

  const workbook = new ExcelJS.Workbook();
  const dataSheet = workbook.addWorksheet('Import Data');
  const refSheet = workbook.addWorksheet('Reference Data');

  // Populate Reference Data
  refSheet.state = 'hidden'; // Hide the reference sheet

  // Prepare reference data columns
  const brandNames = activeBrands.map((b) => b.name);
  const modelNames = activeModels
    .map((m) => {
      const brandName =
        activeBrands.find((b) => b.id === m.brandId)?.name || 'Unknown';
      return `${m.name} [${brandName}]`;
    })
    .sort();
  const locationNames = activeLocations.map((l) => l.name);
  const vendorNames = activeVendors.map((v) => v.companyName);
  const ownerNames = activeOwners.map((o) => o.companyName);

  refSheet.getColumn('A').values = ['Brands', ...brandNames];
  refSheet.getColumn('B').values = ['Models', ...modelNames];
  refSheet.getColumn('C').values = ['Locations', ...locationNames];
  refSheet.getColumn('D').values = ['Vendors', ...vendorNames];
  refSheet.getColumn('E').values = ['Owners', ...ownerNames];

  // Define Import Data Headers
  const columns = [
    { header: 'Serial Number', key: 'serialNumber', width: 20 },
    { header: 'Brand Name', key: 'brandName', width: 20 },
    { header: 'Model Name', key: 'modelName', width: 35 },
    { header: 'Location Name', key: 'locationName', width: 25 },
    { header: 'Owner Name', key: 'ownerName', width: 25 },
    { header: 'Condition', key: 'condition', width: 15 },
    { header: 'Purchase Date', key: 'purchaseDate', width: 15 },
    { header: 'Base Price', key: 'basePrice', width: 15 },
    { header: 'Tax', key: 'tax', width: 10 },
    { header: 'Shipping Cost', key: 'shippingCost', width: 15 },
    { header: 'Currency Code', key: 'currencyCode', width: 15 },
    { header: 'Warranty Months', key: 'warrantyMonths', width: 15 },
    { header: 'Vendor Name', key: 'vendorName', width: 25 },
  ];

  const customSchema = category.customSchema as {
    assetTracking?: { fieldName: string; inputType: string }[];
  };

  const customFields = customSchema?.assetTracking || [];
  customFields.forEach((field) => {
    columns.push({
      header: field.fieldName,
      key: `custom_${field.fieldName}`,
      width: 20,
    });
  });

  columns.push({ header: 'Notes', key: 'notes', width: 30 });

  dataSheet.columns = columns;

  // Format header row
  dataSheet.getRow(1).font = { bold: true };
  dataSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Enforce Date Formatting across columns
  dataSheet.getColumn('H').numFmt = 'yyyy-mm-dd'; // Purchase Date
  let formatColIndex = 15;
  customFields.forEach(field => {
    if (field.inputType === 'Date') {
      dataSheet.getColumn(formatColIndex).numFmt = 'yyyy-mm-dd';
    }
    formatColIndex++;
  });

  // Add Data Validation
  const maxRows = 5000;
  for (let i = 2; i <= maxRows; i++) {
    // Force native date picker / valid layout for Purchase Date
    dataSheet.getCell(`H${i}`).dataValidation = {
      type: 'date',
      operator: 'greaterThanOrEqual',
      showErrorMessage: true,
      allowBlank: true,
      formulae: [new Date('1900-01-01')],
      errorStyle: 'error',
      errorTitle: 'Invalid Date',
      error: 'Please enter a valid date in YYYY-MM-DD format.',
    };

    if (brandNames.length > 0) {
      dataSheet.getCell(`C${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Reference Data'!$A$2:$A$${brandNames.length + 1}`],
      };
    }
    if (modelNames.length > 0) {
      dataSheet.getCell(`D${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Reference Data'!$B$2:$B$${modelNames.length + 1}`],
      };
    }
    if (locationNames.length > 0) {
      dataSheet.getCell(`E${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Reference Data'!$C$2:$C$${locationNames.length + 1}`],
      };
    }
    if (ownerNames.length > 0) {
      dataSheet.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Reference Data'!$E$2:$E$${ownerNames.length + 1}`],
      };
    }

    dataSheet.getCell(`G${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"New,Excellent,Fair,Poor,Damaged"'],
    };

    dataSheet.getCell(`L${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"NOK,USD,LKR"'],
    };

    if (vendorNames.length > 0) {
      dataSheet.getCell(`N${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Reference Data'!$D$2:$D$${vendorNames.length + 1}`],
      };
    }

    // Add validation for custom fields
    let colIndex = 15;
    customFields.forEach((field) => {
      const cell = dataSheet.getCell(i, colIndex);
      if (field.inputType === 'Boolean') {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Yes,No"'],
        };
      } else if (field.inputType === 'Date') {
        cell.dataValidation = {
          type: 'date',
          operator: 'greaterThanOrEqual',
          showErrorMessage: true,
          allowBlank: true,
          formulae: [new Date('1900-01-01')],
          errorStyle: 'error',
          errorTitle: 'Invalid Date',
          error: 'Please enter a valid date in YYYY-MM-DD format.',
        };
      }
      colIndex++;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    fileName: `${category.name.replace(/\s+/g, '-').toLowerCase()}-import-template.xlsx`,
  };
}
