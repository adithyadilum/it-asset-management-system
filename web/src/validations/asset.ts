import { z } from 'zod';

export const DB_PILLAR_VALUES = [
  'IT & Digital',
  'Software',
  'Office Furniture',
  'Office Electronics',
] as const;

export type DbPillar = (typeof DB_PILLAR_VALUES)[number];
export type RegistrationPillarInput = DbPillar;

export const registrationSchema = z.object({
  // Identity
  name: z
    .string()
    .trim()
    .min(1, { message: 'Asset name is required.' })
    .max(255, { message: 'Asset name must be 255 characters or less.' }),
  serialNumber: z
    .string()
    .trim()
    .min(1, { message: 'Serial number is required.' })
    .max(255, { message: 'Serial number must be 255 characters or less.' }),

  // Classification
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
  ownerId: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const normalized = value.trim();
      return normalized.length === 0 ? undefined : normalized;
    },
    z.string().uuid({ message: 'Owner is invalid.' }).optional()
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
      if (typeof value !== 'string') {
        return value;
      }

      const normalized = value.trim();
      return normalized.length === 0 ? undefined : normalized;
    },
    z.coerce
      .number({ message: 'Shipping cost must be a valid number.' })
      .nonnegative({ message: 'Shipping cost must be 0 or more.' })
      .optional()
  ),
  tax: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const normalized = value.trim();
      return normalized.length === 0 ? undefined : normalized;
    },
    z.coerce
      .number({ message: 'Tax must be a valid number.' })
      .nonnegative({ message: 'Tax must be 0 or more.' })
      .optional()
  ),
  currencyCode: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const normalized = value.trim().toUpperCase();
      return normalized.length === 0 ? undefined : normalized;
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
      if (typeof value !== 'string') {
        return value;
      }

      const normalized = value.trim();
      return normalized.length === 0 ? undefined : normalized;
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

  // Meta
  pillar: z.enum(DB_PILLAR_VALUES, {
    message: 'Pillar is required.',
  }),
});

export type RegistrationSchemaInput = z.infer<typeof registrationSchema>;

export type RegistrationFieldErrorKey =
  | keyof RegistrationSchemaInput
  | 'invoiceFile'
  | 'form';

export type RegisterAssetActionState = {
  success: boolean;
  message?: string;
  assetId?: string;
  errors?: Partial<Record<RegistrationFieldErrorKey, string[]>>;
};

export const initialRegisterAssetActionState: RegisterAssetActionState = {
  success: false,
};
