import ExcelJS from 'exceljs';
import Papa from 'papaparse';

export type ParsedFileResult = {
  headers: string[];
  rows: Record<string, string>[];
  skippedEmptyRows: number;
};

export async function parseFile(file: File): Promise<ParsedFileResult> {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds the maximum limit of 10MB.');
  }

  const mimeType = file.type;
  const fileName = file.name.toLowerCase();

  const isCsv = mimeType === 'text/csv' || fileName.endsWith('.csv');
  const isXlsx =
    mimeType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileName.endsWith('.xlsx');

  if (!isCsv && !isXlsx) {
    throw new Error('Invalid file type. Only .csv and .xlsx are supported.');
  }

  let headers: string[] = [];
  const rows: Record<string, string>[] = [];
  let skippedEmptyRows = 0;

  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: false, // We will manually skip and count
    });

    if (result.errors.length > 0) {
      // Only throw if it's not just a trailing empty line parsing error
      const nonTrivialErrors = result.errors.filter(
        (err) => err.code !== 'TooManyFields' && err.code !== 'TooFewFields'
      );
      if (nonTrivialErrors.length > 0) {
        const firstError = nonTrivialErrors[0];
        throw new Error(
          `CSV Parsing error on row ${firstError.row}: ${firstError.message}`
        );
      }
    }

    headers = result.meta.fields || [];

    for (const row of result.data) {
      const isEmpty = Object.values(row).every(
        (val) => !val || val.trim() === ''
      );

      if (isEmpty) {
        skippedEmptyRows++;
      } else {
        const trimmedRow: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          trimmedRow[key] = value ? value.trim() : '';
        }
        rows.push(trimmedRow);
      }
    }
  } else {
    // XLSX
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0]; // First sheet
    if (!worksheet) {
      throw new Error('Excel file is empty.');
    }

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.text ? cell.text.trim() : '';
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      let isEmpty = true;
      const rowData: Record<string, string> = {};

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          const textValue = cell.text ? cell.text.trim() : '';
          rowData[header] = textValue;
          if (textValue !== '') {
            isEmpty = false;
          }
        }
      });

      // Fill in missing headers with empty strings
      headers.forEach((h) => {
        if (rowData[h] === undefined) {
          rowData[h] = '';
        }
      });

      if (isEmpty) {
        skippedEmptyRows++;
      } else {
        rows.push(rowData);
      }
    });
  }

  if (rows.length > 5000) {
    throw new Error('File exceeds the maximum limit of 5,000 data rows.');
  }

  return { headers, rows, skippedEmptyRows };
}
