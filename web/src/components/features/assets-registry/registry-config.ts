import type { RegistryPillar } from '@/lib/data/assets-registry-repo';

export type RegistryView =
  | 'hardware'
  | 'software'
  | 'furniture'
  | 'office-electronics';

export interface RegistryFilterFieldOption {
  value: 'Status' | 'User';
  label: string;
}

export interface RegistryViewConfig {
  view: RegistryView;
  pillar: RegistryPillar;
  title: string;
  showAllCategoryOption: boolean;
  allCategoryLabel: string;
  defaultCategoryLabel: string;
  fallbackCategories: string[];
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
    fallbackCategories: [
      'Mobiles',
      'Desktops',
      'Monitors',
      'Servers',
      'Network Devices',
      'Printers / Scanners',
      'UPS units',
      'External hard drives',
      'Docking stations',
      'Webcams / Headsets',
      'Mobile phones / Tablets',
      'Conference room equipment',
      'Consumables',
    ],
    defaultPageSize: 16,
    rowsPerPageOptions: [3, 9, 16, 24],
    filterFieldOptions: [
      { value: 'Status', label: 'Status' },
      { value: 'User', label: 'User' },
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
    fallbackCategories: [
      'Subscriptions',
      'Perpetual Licenses',
      'SaaS Tools',
      'Security Suites',
      'Productivity Tools',
    ],
    defaultPageSize: 16,
    rowsPerPageOptions: [9, 16, 24],
    filterFieldOptions: [
      { value: 'Status', label: 'Status' },
      { value: 'User', label: 'User' },
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
    fallbackCategories: [
      'Chairs',
      'Desks',
      'Tables',
      'Storage',
      'Whiteboards',
      'Lighting',
    ],
    defaultPageSize: 16,
    rowsPerPageOptions: [9, 16, 24],
    filterFieldOptions: [
      { value: 'Status', label: 'Status' },
      { value: 'User', label: 'User' },
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
    fallbackCategories: [
      'Air Conditioners',
      'Water Dispensers',
      'Generators',
      'CCTV Cameras',
      'Access Control Devices',
      'Fire Extinguishers',
      'Smoke Detectors',
    ],
    defaultPageSize: 9,
    rowsPerPageOptions: [9, 16, 24],
    filterFieldOptions: [
      { value: 'Status', label: 'Status' },
      { value: 'User', label: 'User' },
    ],
    categoryVisibilityMode: 'always',
    statusColumnLabel: 'Condition',
    searchPlaceholder: 'Search...',
    addAssetLabel: 'Add Asset',
  },
};
