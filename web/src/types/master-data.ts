export type FormErrorMap<TFields extends string> = Partial<
  Record<TFields, string[]>
>;

export const LOCATION_TYPES = [
  'HQ',
  'Branch',
  'Floor',
  'Room',
  'Remote',
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];

export const LOCATION_TYPE_OPTIONS: Array<{
  label: LocationType;
  value: LocationType;
}> = LOCATION_TYPES.map((type) => ({
  label: type,
  value: type,
}));

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
