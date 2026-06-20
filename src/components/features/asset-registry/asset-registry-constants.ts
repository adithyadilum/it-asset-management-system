import type { RegistryView } from './registry-config';

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

export const BULK_FETCH_PAGE_SIZE = 200;

// ---------------------------------------------------------------------------
// UI behaviour
// ---------------------------------------------------------------------------

export const SEARCH_DEBOUNCE_MS = 250;

// ---------------------------------------------------------------------------
// Fallback display values
// ---------------------------------------------------------------------------

export const DEFAULT_MODEL_FALLBACK = 'Standard Model';

// ---------------------------------------------------------------------------
// Filter defaults
// ---------------------------------------------------------------------------

export const DEFAULT_STATUS_OPTIONS = [
  'Available',
  'Assigned',
  'In Repair',
  'Defective',
  'Lost',
  'Retired',
  'Pending Disposal',
  'Disposed',
  'New',
];

// ---------------------------------------------------------------------------
// Skeleton column width presets keyed by registry view.
// Centralised here so layout values are easy to locate and adjust in one place.
// ---------------------------------------------------------------------------

export const SKELETON_COLUMN_WIDTHS: Record<RegistryView, string[]> = {
  software: ['w-[26%]', 'w-[22%]', 'w-[17%]', 'w-[17%]', 'w-[18%]'],
  furniture: ['w-[18%]', 'w-[26%]', 'w-[16%]', 'w-[20%]', 'w-[20%]'],
  'office-electronics': ['w-[16%]', 'w-[20%]', 'w-[14%]', 'w-[16%]', 'w-[18%]', 'w-[16%]'],
  hardware: ['w-[14%]', 'w-[24%]', 'w-[16%]', 'w-[14%]', 'w-[16%]', 'w-[16%]'],
  unified: ['w-[14%]', 'w-[24%]', 'w-[16%]', 'w-[14%]', 'w-[16%]', 'w-[16%]'],
};
