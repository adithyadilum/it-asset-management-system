import { z } from 'zod';

const FURNITURE_CONDITIONS = ['New', 'Excellent', 'Fair', 'Poor', 'Damaged'] as const;

export const furnitureRegistrationSchema = z.object({
  categoryId: z.coerce
    .number({ message: 'Category is required.' })
    .int({ message: 'Category is required.' })
    .positive({ message: 'Category is required.' }),
  manufacturerId: z.coerce
    .number({ message: 'Manufacturer is required.' })
    .int({ message: 'Manufacturer is required.' })
    .positive({ message: 'Manufacturer is required.' }),
  productLineId: z.coerce
    .number({ message: 'Product line is required.' })
    .int({ message: 'Product line is required.' })
    .positive({ message: 'Product line is required.' }),
  locationId: z.coerce
    .number({ message: 'Location is required.' })
    .int({ message: 'Location is required.' })
    .positive({ message: 'Location is required.' }),
  floor: z
    .string()
    .trim()
    .min(1, { message: 'Floor is required.' })
    .max(50, { message: 'Floor must be 50 characters or less.' }),
  condition: z.enum(FURNITURE_CONDITIONS, {
    message: 'Condition is required.',
  }),
  material: z
    .string()
    .trim()
    .min(1, { message: 'Material is required.' })
    .max(100, { message: 'Material must be 100 characters or less.' }),
  dimensions: z
    .string()
    .trim()
    .min(1, { message: 'Dimensions are required.' })
    .max(120, { message: 'Dimensions must be 120 characters or less.' }),
  headerNote: z
    .string()
    .trim()
    .max(2_000, { message: 'Note must be 2000 characters or less.' })
    .optional(),
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
  vendorId: z.coerce
    .number({ message: 'Vendor is required.' })
    .int({ message: 'Vendor is required.' })
    .positive({ message: 'Vendor is required.' }),
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
  purchaseNote: z
    .string()
    .trim()
    .max(2_000, { message: 'Purchase note must be 2000 characters or less.' })
    .optional(),
  pillar: z.literal('Office Furniture'),
});

export type FurnitureRegistrationInput = z.infer<
  typeof furnitureRegistrationSchema
>;

export type FurnitureRegistrationFieldErrorKey =
  | keyof FurnitureRegistrationInput
  | 'invoiceFile'
  | 'form';

export type RegisterFurnitureAssetActionState = {
  success: boolean;
  message?: string;
  assetId?: string;
  errors?: Partial<Record<FurnitureRegistrationFieldErrorKey, string[]>>;
};

export const initialRegisterFurnitureAssetActionState: RegisterFurnitureAssetActionState =
  {
    success: false,
  };
