import type {
  BrandFormState,
  CategoryFormState,
  MasterDataRecordEntity,
  UpdateMasterDataState,
} from '@/types/master-data';

export const MASTER_DATA_RECORD_ENTITIES = [
  'locations',
  'asset-categories',
  'brands',
  'device-models',
  'vendors',
  'owners',
  'departments',
  'statuses',
] as const satisfies ReadonlyArray<MasterDataRecordEntity>;

export const INITIAL_BRAND_FORM_STATE: BrandFormState = {
  success: false,
  message: '',
};

export const INITIAL_CATEGORY_FORM_STATE: CategoryFormState = {
  success: false,
  message: '',
};

export const INITIAL_UPDATE_MASTER_DATA_STATE: UpdateMasterDataState = {
  success: false,
  message: '',
};

export const INITIAL_CREATE_MASTER_DATA_STATE: UpdateMasterDataState = {
  success: false,
  message: '',
};
