// ---------------------------------------------------------------------------
// Filter State
// ---------------------------------------------------------------------------

export interface FilterState {
  source: string;
  assetType: string;
  category: string;
  location: string;
  status: string;
  masterDataType: string;
  dateFrom?: string;
  dateTo?: string;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  source: '',
  assetType: '',
  category: '',
  location: '',
  status: '',
  masterDataType: '',
  dateFrom: '',
  dateTo: '',
};

// ---------------------------------------------------------------------------
// Report Preview Row (matches the preview DataTable columns)
// ---------------------------------------------------------------------------

export interface ReportPreviewRow {
  id: string;
  assetTag: string;
  name: string | null;
  category: string;
  assignedTo: string | null;
  status: string;
}

// ---------------------------------------------------------------------------
// Report Template 
// ---------------------------------------------------------------------------

export interface ReportTemplateData {
  id: number;
  name: string;
  reportCode: string;
  description: string | null;
  isActive: boolean;
  dataSource: string;
  filters: {
    assetType?: string;
    category?: string;
    location?: string;
    status?: string;
  } | null;
  fields: string[] | null;
  sortDirection: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// DB row type (returned from server action queries)
// ---------------------------------------------------------------------------

export interface ReportTemplateRow {
  id: number;
  name: string;
  reportCode: string;
  description: string | null;
  isActive: boolean;
  dataSource: string;
  filters: unknown;
  fields: unknown;
  sortDirection: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Server action result type
// ---------------------------------------------------------------------------

export interface CreateReportTemplateResult {
  success: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Data source options available for report templates
// ---------------------------------------------------------------------------

export const REPORT_DATA_SOURCES = [
  'Assets',
  'Maintenance Records',
  'Disposal Records',
  'Software Licenses',
  'Audit Logs',
] as const;

// ---------------------------------------------------------------------------
// Available report fields for template configuration
// ---------------------------------------------------------------------------

export const REPORT_FIELD_OPTIONS = [
  'Asset ID',
  'Asset Name',
  'Category',
  'Brand',
  'Model',
  'Serial Number',
  'Status',
  'Location',
  'Assigned To',
  'Purchase Date',
  'Purchase Cost',
  'Warranty Expiry',
  'Maintenance Cost',
  'Disposal Status',
  'Disposal Reason',
] as const;

