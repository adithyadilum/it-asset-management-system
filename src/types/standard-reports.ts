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

export interface ReportPreviewFilters {
  source?: string;
  assetType?: string;
  category?: string;
  location?: string;
  status?: string;
  masterDataType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Report Preview Row (matches the preview DataTable columns)
// ---------------------------------------------------------------------------

export interface ReportPreviewRow {
  id: string;
  [key: string]: unknown;
}

/** Data contract for the report PDF generator */
export interface ReportPdfData {
  title: string; /** Report title (e.g., "Asset Inventory Report" or template name) */
  description?: string; /** Optional report description shown on the first page */
  generatedBy: string; /** Who generated this report */
  generatedAt: string; /** ISO date string of generation time */
  filtersApplied: string; /** Human-readable summary of applied filters */
  filterDetails?: Array<{
    label: string;
    value: string;
  }>; /** Structured filters for the cover page */
  dataSource: string; /** Data source name (e.g., "Assets", "Master Data") */
  summary: {
    /** Summary metrics shown in the executive summary block */
    totalRecords: number; /** Optional additional KPIs — keeps it extensible */
    [key: string]: string | number;
  };
  headers: string[]; /** Column headers in display order */
  rows: ReportPreviewRow[]; /** Row data — each row is a flat key/value object keyed by header name */
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
    dateFrom?: string;
    dateTo?: string;
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
  'Active Assignments',
  'Return History',
  'Maintenance Records',
  'Disposal Records',
  'Purchase Records',
  'Depreciation Ledger',
  'TCO Overview',
  'Software Licenses',
  'Audit Logs',
  'Master Data',
] as const;

// ---------------------------------------------------------------------------
// Available report fields for template configuration
// ---------------------------------------------------------------------------

export const REPORT_FIELD_OPTIONS_BY_SOURCE: Record<string, string[]> = {
  Assets: [
    'Asset Tag',
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
  ],
  'Active Assignments': [
    'Assignment ID',
    'Asset Tag',
    'Asset Name',
    'Assigned To',
    'Assigned By',
    'Assigned Date',
    'Expected Return Date',
    'State',
    'Acceptance Status',
    'Days Since Assigned',
    'Notes',
  ],
  'Return History': [
    'Return ID',
    'Asset Tag',
    'Asset Name',
    'Assigned To',
    'Returned By',
    'Assigned Date',
    'Returned Date',
    'Duration (Days)',
    'Return Condition',
    'State',
    'Notes',
  ],
  'Maintenance Records': [
    'Ticket ID',
    'Asset Tag',
    'Asset Name',
    'Ticket Type',
    'Vendor Name',
    'RMA Number',
    'Reported Issue',
    'Resolution Notes',
    'Estimated Cost',
    'Actual Cost',
    'Cost Variance',
    'Estimated Return Date',
    'Completion Date',
    'Duration (Days)',
    'Status',
    'Dispatched By',
    'Created At',
  ],
  'Disposal Records': [
    'Disposal ID',
    'Asset Tag',
    'Asset Name',
    'Requested By',
    'Approved By',
    'Status',
    'Reason',
    'Justification',
    'Disposal Method',
    'Data Wiped',
    'Tags Removed',
    'Salvage Value',
    'Book Value',
    'Gain/Loss',
    'Requested At',
    'Resolved At',
    'Processing Time (Days)',
  ],
  'Purchase Records': [
    'Purchase ID',
    'Asset Tag',
    'Asset Name',
    'Vendor',
    'Purchase Date',
    'Base Price',
    'Tax',
    'Shipping Cost',
    'Total Cost',
    'Currency',
    'Warranty Expiry',
    'Warranty Remaining (Days)',
  ],
  'Depreciation Ledger': [
    'Asset Tag',
    'Asset Name',
    'Category',
    'Purchase Cost',
    'Useful Life (Months)',
    'Salvage Value',
    'Age (Months)',
    'Monthly Depreciation',
    'Accumulated Depreciation',
    'Current Book Value',
    'Depreciation %',
  ],
  'TCO Overview': [
    'Asset Tag',
    'Asset Name',
    'Category',
    'Purchase Cost',
    'Total Maintenance Cost',
    'Maintenance Count',
    'Accumulated Depreciation',
    'Current Book Value',
    'TCO',
  ],
  'Software Licenses': [
    'License ID',
    'Software Name',
    'Publisher',
    'License Key',
    'License Type',
    'Total Seats',
    'Used Seats',
    'Available Seats',
    'Utilization %',
    'Start Date',
    'Expiry Date',
    'Days Until Expiry',
    'Status',
  ],
  'Audit Logs': [
    'Log ID',
    'Timestamp',
    'User',
    'Action',
    'Entity Type',
    'Entity ID',
    'IP Address',
    'Details',
  ],
  'Master Data': [
    'Record Code',
    'Type',
    'Name',
    'Description',
    'Status',
    'CreatedAt',
    'UpdatedAt',
  ],
};

export const REPORT_FIELD_OPTIONS = [
  'Asset Tag',
  'Record Code',
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
  'IP Address',
] as const;

// ---------------------------------------------------------------------------
// Unified Filter Options Interface
// ---------------------------------------------------------------------------

export interface FilterOptions {
  assetTypes: string[];
  categories: { name: string; pillar: string }[];
  locations: string[];
  statuses: string[];
  assignmentStates: string[];
  returnConditions: string[];
  maintenanceStatuses: string[];
  ticketTypes: string[];
  disposalStatuses: string[];
  licenseTypes: string[];
  auditActionTypes: string[];
  vendors: string[];
  masterDataTypes: { value: string; label: string }[];
}

// ---------------------------------------------------------------------------
// Source-to-Filters Dynamic Mapping
// ---------------------------------------------------------------------------

export const REPORT_FILTERS_BY_SOURCE: Record<
  string,
  {
    key: keyof FilterState;
    label: string;
    type: 'select' | 'searchable' | 'date';
    optionsKey?: keyof FilterOptions;
  }[]
> = {
  Assets: [
    {
      key: 'assetType',
      label: 'Asset Type',
      type: 'select',
      optionsKey: 'assetTypes',
    },
    {
      key: 'category',
      label: 'Category',
      type: 'searchable',
      optionsKey: 'categories',
    },
    {
      key: 'location',
      label: 'Location',
      type: 'searchable',
      optionsKey: 'locations',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'searchable',
      optionsKey: 'statuses',
    },
  ],
  'Active Assignments': [
    {
      key: 'assetType',
      label: 'Asset Type',
      type: 'select',
      optionsKey: 'assetTypes',
    },
    {
      key: 'status',
      label: 'State',
      type: 'searchable',
      optionsKey: 'assignmentStates',
    },
    { key: 'dateFrom', label: 'Date From', type: 'date' },
    { key: 'dateTo', label: 'Date To', type: 'date' },
  ],
  'Return History': [
    {
      key: 'assetType',
      label: 'Asset Type',
      type: 'select',
      optionsKey: 'assetTypes',
    },
    {
      key: 'status',
      label: 'Return Condition',
      type: 'searchable',
      optionsKey: 'returnConditions',
    },
    { key: 'dateFrom', label: 'Returned From', type: 'date' },
    { key: 'dateTo', label: 'Returned To', type: 'date' },
  ],
  'Maintenance Records': [
    {
      key: 'assetType',
      label: 'Ticket Type',
      type: 'select',
      optionsKey: 'ticketTypes',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'searchable',
      optionsKey: 'maintenanceStatuses',
    },
    { key: 'dateFrom', label: 'Date From', type: 'date' },
    { key: 'dateTo', label: 'Date To', type: 'date' },
  ],
  'Disposal Records': [
    {
      key: 'status',
      label: 'Status',
      type: 'searchable',
      optionsKey: 'disposalStatuses',
    },
    { key: 'dateFrom', label: 'Date From', type: 'date' },
    { key: 'dateTo', label: 'Date To', type: 'date' },
  ],
  'Purchase Records': [
    {
      key: 'location',
      label: 'Vendor',
      type: 'searchable',
      optionsKey: 'vendors',
    },
    { key: 'dateFrom', label: 'Date From', type: 'date' },
    { key: 'dateTo', label: 'Date To', type: 'date' },
  ],
  'Depreciation Ledger': [
    {
      key: 'assetType',
      label: 'Asset Type',
      type: 'select',
      optionsKey: 'assetTypes',
    },
    {
      key: 'category',
      label: 'Category',
      type: 'searchable',
      optionsKey: 'categories',
    },
  ],
  'TCO Overview': [
    {
      key: 'assetType',
      label: 'Asset Type',
      type: 'select',
      optionsKey: 'assetTypes',
    },
    {
      key: 'category',
      label: 'Category',
      type: 'searchable',
      optionsKey: 'categories',
    },
  ],
  'Software Licenses': [
    {
      key: 'status',
      label: 'License Type',
      type: 'searchable',
      optionsKey: 'licenseTypes',
    },
    { key: 'dateFrom', label: 'Expiry From', type: 'date' },
    { key: 'dateTo', label: 'Expiry To', type: 'date' },
  ],
  'Audit Logs': [
    {
      key: 'status',
      label: 'Action Type',
      type: 'searchable',
      optionsKey: 'auditActionTypes',
    },
    { key: 'dateFrom', label: 'Date From', type: 'date' },
    { key: 'dateTo', label: 'Date To', type: 'date' },
  ],
  'Master Data': [
    {
      key: 'assetType',
      label: 'Asset Type',
      type: 'select',
      optionsKey: 'assetTypes',
    },
    {
      key: 'masterDataType',
      label: 'Record Type',
      type: 'searchable',
      optionsKey: 'masterDataTypes',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'searchable',
      optionsKey: 'statuses',
    },
  ],
};

export function getPrimaryIdColumn(source: string): string {
  const sourceFields = REPORT_FIELD_OPTIONS_BY_SOURCE[source];
  if (sourceFields && sourceFields.length > 0) {
    return sourceFields[0];
  }
  return 'Asset Tag';
}
