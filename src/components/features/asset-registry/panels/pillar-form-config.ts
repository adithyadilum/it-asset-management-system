import { type DbPillar } from '@/lib/validations/asset-registration';

export type PillarFormConfig = {
  // Panel chrome
  panelTitle: string;
  panelDescription: string;

  // Field labels & placeholders
  serialLabel: string;
  modelLabel: string;
  brandLabel: string;
  submitLabel: string;
  submittingLabel: string;
  modelEmptyMessage: string;
  modelFilteredEmptyMessage: string;
  noteLabel: string;
  notePlaceholder: string;
  purchaseSectionTitle: string;

  // Field visibility
  showSerialNumber: boolean;
  showLocationField: boolean;
  showConditionField: boolean;
  showWarrantyPeriod: boolean;
  showShippingCost: boolean;
  showInvoiceAttachment: boolean;
  showSoftwareLicensingSection: boolean;
  showCostPerSeat: boolean;
  showSuccessTagDialog: boolean;

  // Defaults
  defaultCondition?: string;
};

const DEFAULT_CONFIG: PillarFormConfig = {
  panelTitle: 'Asset Registry',
  panelDescription: 'Register a new asset',
  serialLabel: 'Serial Number :',
  modelLabel: 'Model',
  brandLabel: 'Brand',
  submitLabel: 'Add Asset',
  submittingLabel: 'Adding asset...',
  modelEmptyMessage: 'No models found.',
  modelFilteredEmptyMessage: 'No models found for selected category and brand.',
  noteLabel: 'Note :',
  notePlaceholder: 'Add a note about this asset',
  purchaseSectionTitle: 'Purchase Details',
  
  showSerialNumber: true,
  showLocationField: false,
  showConditionField: false,
  showWarrantyPeriod: true,
  showShippingCost: true,
  showInvoiceAttachment: true,
  showSoftwareLicensingSection: false,
  showCostPerSeat: false,
  showSuccessTagDialog: true,
};

export const PILLAR_FORM_CONFIGS: Record<DbPillar, PillarFormConfig> = {
  'Hardware': {
    ...DEFAULT_CONFIG,
    panelDescription: 'Hardware',
  },
  'Software': {
    ...DEFAULT_CONFIG,
    panelTitle: 'Software Registry',
    panelDescription: 'Software',
    serialLabel: 'License Key :',
    modelLabel: 'Product',
    submitLabel: 'Add Software',
    submittingLabel: 'Adding software...',
    modelEmptyMessage: 'No products found.',
    modelFilteredEmptyMessage: 'No products found for selected category and brand.',
    purchaseSectionTitle: 'Licensing & Purchase Details',

    showSoftwareLicensingSection: true,
    showCostPerSeat: true,
    showShippingCost: false,
    showWarrantyPeriod: false,
    showSuccessTagDialog: false,
  },
  'Office Furniture': {
    ...DEFAULT_CONFIG,
    panelDescription: 'Office Furniture',
    showLocationField: true,
    showConditionField: true,
    defaultCondition: 'New',
  },
  'Office Electronics': {
    ...DEFAULT_CONFIG,
    panelDescription: 'Office Electronics',
    showLocationField: true,
    showConditionField: true,
    defaultCondition: 'New',
  },
};

export function getPillarFormConfig(pillar?: string | null): PillarFormConfig {
  if (!pillar) return PILLAR_FORM_CONFIGS['Hardware'];
  return PILLAR_FORM_CONFIGS[pillar as DbPillar] ?? PILLAR_FORM_CONFIGS['Hardware'];
}
