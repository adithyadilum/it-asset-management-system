import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared Constants
// ---------------------------------------------------------------------------

export const DB_PILLAR_VALUES = [
  'IT & Digital',
  'Software',
  'Office Furniture',
  'Office Electronics',
] as const;

export type DbPillar = (typeof DB_PILLAR_VALUES)[number];
export type RegistrationPillarInput = DbPillar;

// ---------------------------------------------------------------------------
// Unified Asset Registration Schema
//
// The form fields are rendered dynamically from the category's customSchema.
// This schema validates the common fields shared by all pillar registrations.
// Pillar-specific custom field data is captured in `instanceAttributes` (JSONB).
// ---------------------------------------------------------------------------

export const assetRegistrationSchema = z.object({
  // Classification (always required)
  pillar: z.enum(DB_PILLAR_VALUES, {
    message: 'Pillar is required.',
  }),
  categoryId: z.coerce
    .number({ message: 'Category is required.' })
    .int({ message: 'Category is required.' })
    .positive({ message: 'Category is required.' }),
  brandId: z.coerce
    .number({ message: 'Brand is required.' })
    .int({ message: 'Brand is required.' })
    .positive({ message: 'Brand is required.' }),
  modelId: z.coerce
    .number({ message: 'Model is required.' })
    .int({ message: 'Model is required.' })
    .positive({ message: 'Model is required.' }),

  // Identity
  name: z
    .string()
    .trim()
    .min(1, { message: 'Asset name is required.' })
    .max(255, { message: 'Asset name must be 255 characters or less.' }),
  serialNumber: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z
      .string()
      .max(255, { message: 'Serial number must be 255 characters or less.' })
      .optional()
  ),

  // Location (optional — applies to furniture, electronics, etc.)
  locationId: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined)
        return undefined;
      return value;
    },
    z.coerce
      .number({ message: 'Location must be a valid selection.' })
      .int()
      .positive()
      .optional()
  ),

  // Assignment (optional)
  ownerId: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined)
        return undefined;
      return value;
    },
    z.coerce
      .number({ message: 'Owner is invalid.' })
      .int()
      .positive()
      .optional()
  ),

  // Condition (optional — applies to furniture, electronics)
  condition: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z
      .enum(['New', 'Excellent', 'Fair', 'Poor', 'Damaged'], {
        message: 'Condition must be a valid option.',
      })
      .optional()
  ),

  // Financials
  purchaseDate: z
    .string()
    .trim()
    .min(1, { message: 'Purchase date is required.' })
    .pipe(z.coerce.date({ message: 'Purchase date is invalid.' })),
  basePrice: z.coerce
    .number({ message: 'Base price is required.' })
    .nonnegative({ message: 'Base price must be 0 or more.' }),
  shippingCost: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.coerce
      .number({ message: 'Shipping cost must be a valid number.' })
      .nonnegative({ message: 'Shipping cost must be 0 or more.' })
      .optional()
  ),
  tax: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.coerce
      .number({ message: 'Tax must be a valid number.' })
      .nonnegative({ message: 'Tax must be 0 or more.' })
      .optional()
  ),
  currencyCode: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim().toUpperCase();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z
      .string()
      .regex(/^[A-Z]{3}$/, {
        message: 'Currency code must be a 3-letter code (e.g. USD).',
      })
      .optional()
  ),
  warrantyMonths: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.coerce
      .number({ message: 'Warranty months must be a valid number.' })
      .int({ message: 'Warranty months must be a whole number.' })
      .min(1, { message: 'Warranty months must be at least 1.' })
      .max(120, { message: 'Warranty months must be 120 or less.' })
      .optional()
  ),
  vendorId: z.coerce
    .number({ message: 'Vendor is required.' })
    .int({ message: 'Vendor is required.' })
    .positive({ message: 'Vendor is required.' }),

  // Notes
  notes: z
    .string()
    .trim()
    .max(2_000, { message: 'Notes must be 2000 characters or less.' })
    .optional(),

  // Dynamic attributes from category custom schema (JSONB)
  // Validated loosely here — the server can enforce per-field rules if needed.
  instanceAttributes: z.record(z.string(), z.unknown()).optional(),
});

export type AssetRegistrationInput = z.infer<typeof assetRegistrationSchema>;

export type AssetRegistrationFieldErrorKey = string;

export type RegisterAssetActionState = {
  success: boolean;
  message?: string;
  assetId?: string;
  errors?: Partial<Record<AssetRegistrationFieldErrorKey, string[]>>;
};

export const initialRegisterAssetActionState: RegisterAssetActionState = {
  success: false,
};

// ---------------------------------------------------------------------------
// Pillar prefix map for asset tag generation
// ---------------------------------------------------------------------------

export const PILLAR_PREFIX_MAP: Record<DbPillar, string> = {
  'IT & Digital': 'HRW',
  Software: 'SFT',
  'Office Furniture': 'FUR',
  'Office Electronics': 'ELC',
};
