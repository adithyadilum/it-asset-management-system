export type FormErrorMap<TFields extends string> = Partial<
  Record<TFields, string[]>
>;

export type MasterDataRecordEntity =
  | 'locations'
  | 'asset-categories'
  | 'brands'
  | 'device-models'
  | 'vendors'
  | 'departments';

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
