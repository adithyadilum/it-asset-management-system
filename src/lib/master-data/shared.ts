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

export type CustomAttribute = {
    id: string;
    fieldName: string;
    inputType: "Text" | "Number" | "Date" | "Dropdown" | "Boolean";
    required: boolean;
};

export function createCustomAttribute(): CustomAttribute {
    return {
        id: crypto.randomUUID(),
        fieldName: "",
        inputType: "Text",
        required: false,
    };
}

export function buildSchemaSectionPayload(attributes: CustomAttribute[]) {
    const payload = attributes.map((attribute) => ({
        fieldName: attribute.fieldName,
        inputType: attribute.inputType,
        required: attribute.required,
    }));

    const hasOnlyDefaultEmptyRow =
        payload.length === 1 && payload[0].fieldName.trim().length === 0;

    return hasOnlyDefaultEmptyRow ? [] : payload;
}
