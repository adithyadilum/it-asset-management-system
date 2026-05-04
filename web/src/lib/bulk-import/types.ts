export type BulkImportPreviewResult = {
  success: boolean;
  message?: string;
  summary?: {
    totalRows: number;
    validCount: number;
    errorCount: number;
    skippedEmptyRows: number;
  };
  validRows?: ResolvedImportRow[];
  errorRows?: ImportErrorRow[];
};

export type ResolvedImportRow = {
  rowNumber: number; // 1-based from original file
  name: string;
  serialNumber: string | null;
  modelId: number;
  brandId: number;
  locationId: number | null;
  ownerId: number | null;
  vendorId: number;
  condition: string | null;
  purchaseDate: string; // ISO date string
  basePrice: number;
  tax: number;
  shippingCost: number;
  currencyCode: string;
  warrantyMonths: number | null;
  notes: string | null;
  instanceAttributes: Record<string, unknown> | null;
};

export type ImportErrorRow = {
  rowNumber: number;
  assetName: string | null;
  serialNumber: string | null;
  errorStage:
    | 'STRUCTURAL'
    | 'TYPE'
    | 'REFERENTIAL'
    | 'BUSINESS_RULE'
    | 'EAV_SCHEMA';
  errorField: string;
  errorMessage: string;
};

export type BulkImportExecutionResult = {
  success: boolean;
  message?: string;
  summary?: {
    successCount: number;
    failedCount: number;
    importedAssetTags: string[];
  };
  errorCsvData?: string; // CSV string of rows that failed during insert
};
