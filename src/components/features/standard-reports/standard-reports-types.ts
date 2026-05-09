import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Filter State
// ---------------------------------------------------------------------------

export interface FilterState {
  source: string;
  assetType: string;
  category: string;
  location: string;
  status: string;
  dateFrom?: string;
  dateTo?: string;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  source: '',
  assetType: '',
  category: '',
  location: '',
  status: '',
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
// Template Presets
// ---------------------------------------------------------------------------

export interface TemplatePreset {
  source: string;
  category?: string;
  location?: string;
  status?: string;
}

/**
 * Maps each template title to its predefined filter overrides.
 * When a template's "Preview report" is clicked, these values are
 * merged onto `DEFAULT_FILTER_STATE` to auto-populate the sidebar.
 */
export const TEMPLATE_PRESETS: Record<string, TemplatePreset> = {
  'Overdue / Missing': {
    source: 'Asset Registry',
    category: 'Hardware',
    status: 'Lost',
  },
};

// ---------------------------------------------------------------------------
// Report Template type (re-export so it stays co-located with the feature)
// ---------------------------------------------------------------------------

export type ReportTemplate = {
  title: string;
  description: string;
  icon: LucideIcon;
  onPreviewClick?: (title: string) => void;
};
