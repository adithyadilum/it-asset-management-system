import type { RegistryPillar } from '@/lib/data/asset-registry-repo';

export type RegistryView =
  | 'hardware'
  | 'software'
  | 'furniture'
  | 'office-electronics';

export type RegistryFilterField =
  | 'Status'
  | 'Condition'
  | 'Location'
  | 'Model'
  | 'Assigned To';

export interface RegistryFilterFieldOption {
  value: RegistryFilterField;
  label: string;
}

export interface RegistryViewConfig {
  view: RegistryView;
  pillar: RegistryPillar;
  title: string;
  showAllCategoryOption: boolean;
  allCategoryLabel: string;
  defaultCategoryLabel: string;
  defaultPageSize: number;
  rowsPerPageOptions: number[];
  filterFieldOptions: RegistryFilterFieldOption[];
  categoryVisibilityMode: 'always' | 'hideWhenSpecificCategory';
  statusColumnLabel: string;
  searchPlaceholder: string;
  addAssetLabel: string;
}

export const REGISTRY_VIEW_CONFIGS: Record<RegistryView, RegistryViewConfig> = {
  hardware: {
    view: 'hardware',
    pillar: 'IT & Digital',
    title: 'Laptops',
    showAllCategoryOption: false,
    allCategoryLabel: 'All Hardware',
    defaultCategoryLabel: 'Laptops',
    defaultPageSize: 16,
    rowsPerPageOptions: [3, 9, 16, 24],
    filterFieldOptions: [
      { value: 'Status', label: 'Status' },
      { value: 'Condition', label: 'Condition' },
      { value: 'Location', label: 'Location' },
      { value: 'Model', label: 'Model' },
      { value: 'Assigned To', label: 'Assigned To' },
    ],
    categoryVisibilityMode: 'hideWhenSpecificCategory',
    statusColumnLabel: 'Status',
    searchPlaceholder: 'Search...',
    addAssetLabel: 'Add Asset',
  },
  software: {
    view: 'software',
    pillar: 'Software',
    title: 'All Software',
    showAllCategoryOption: true,
    allCategoryLabel: 'All Software',
    defaultCategoryLabel: 'All Software',
    defaultPageSize: 16,
    rowsPerPageOptions: [9, 16, 24],
    filterFieldOptions: [
      { value: 'Status', label: 'Status' },
      { value: 'Location', label: 'Location' },
      { value: 'Model', label: 'Model' },
    ],
    categoryVisibilityMode: 'always',
    statusColumnLabel: 'Status',
    searchPlaceholder: 'Search...',
    addAssetLabel: 'Add Asset',
  },
  furniture: {
    view: 'furniture',
    pillar: 'Office Furniture',
    title: 'All Furniture',
    showAllCategoryOption: true,
    allCategoryLabel: 'All Furniture',
    defaultCategoryLabel: 'All Furniture',
    defaultPageSize: 16,
    rowsPerPageOptions: [9, 16, 24],
    filterFieldOptions: [
      { value: 'Status', label: 'Status' },
      { value: 'Condition', label: 'Condition' },
      { value: 'Location', label: 'Location' },
      { value: 'Model', label: 'Model' },
    ],
    categoryVisibilityMode: 'always',
    statusColumnLabel: 'Condition',
    searchPlaceholder: 'Search...',
    addAssetLabel: 'Add Asset',
  },
  'office-electronics': {
    view: 'office-electronics',
    pillar: 'Office Electronics',
    title: 'All Electronics',
    showAllCategoryOption: true,
    allCategoryLabel: 'All Electronics',
    defaultCategoryLabel: 'All Electronics',
    defaultPageSize: 9,
    rowsPerPageOptions: [9, 16, 24],
    filterFieldOptions: [
      { value: 'Status', label: 'Status' },
      { value: 'Condition', label: 'Condition' },
      { value: 'Location', label: 'Location' },
      { value: 'Model', label: 'Model' },
    ],
    categoryVisibilityMode: 'always',
    statusColumnLabel: 'Condition',
    searchPlaceholder: 'Search...',
    addAssetLabel: 'Add Asset',
  },
};
