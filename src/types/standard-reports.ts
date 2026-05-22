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
  [key: string]: unknown;
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
    masterDataType?: string;
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
  //'Maintenance Records',    commented for later implementation
  //'Disposal Records',
  //'Software Licenses',
  //'Audit Logs',
  'Master Data',
] as const;

// ---------------------------------------------------------------------------
// Available report fields for template configuration
// ---------------------------------------------------------------------------

export const REPORT_FIELD_OPTIONS_BY_SOURCE: Record<string, string[]> = {
  'Assets': [
    'Asset ID', 'Asset Name', 'Category', 'Brand', 'Model', 'Serial Number',
    'Status', 'Location', 'Assigned To', 'Purchase Date', 'Purchase Cost', 'Warranty Expiry'
  ],
  'Maintenance Records': [
    'Record ID', 'Asset Tag', 'Maintenance Type', 'Scheduled Date', 'Completed Date', 'Cost', 'Technician', 'Status'
  ],
  'Disposal Records': [
    'Disposal ID', 'Asset Tag', 'Disposal Type', 'Date', 'Method', 'Salvage Value', 'Certificate'
  ],
  'Software Licenses': [
    'License ID', 'Software Name', 'Publisher', 'Total Seats', 'Used Seats', 'Expiry Date', 'Cost'
  ],
  'Audit Logs': [
    'Log ID', 'Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details'
  ],
  'Master Data': [
    'Record ID', 'Type', 'Name', 'Description', 'Status', 'CreatedAt', 'UpdatedAt'
  ]
};

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

