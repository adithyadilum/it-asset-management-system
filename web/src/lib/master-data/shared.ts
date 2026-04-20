export type FormErrorMap<TFields extends string> = Partial<
  Record<TFields, string[]>
>;

export const MASTER_DATA_RECORD_ENTITIES = [
  'locations',
  'asset-categories',
  'brands',
  'device-models',
  'vendors',
  'departments',
] as const;

export type MasterDataRecordEntity =
  (typeof MASTER_DATA_RECORD_ENTITIES)[number];

export type BrandFormState = {
  success: boolean;
  message: string;
  errors?: FormErrorMap<'name' | 'isActive'>;
};

export type CategoryFormState = {
  success: boolean;
  message: string;
  errors?: FormErrorMap<'pillar' | 'name' | 'prefix' | 'customSchema'>;
};

export type UpdateMasterDataState = {
  success: boolean;
  message: string;
  errors?: FormErrorMap<string>;
};

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
