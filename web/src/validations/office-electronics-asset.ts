import { z } from 'zod';

export const officeElectronicsRegistrationSchema = z.object({
  categoryId: z.coerce
    .number({ message: 'Category is required.' })
    .int({ message: 'Category is required.' })
    .positive({ message: 'Category is required.' }),
  brandId: z.coerce
    .number({ message: 'Brand is required.' })
    .int({ message: 'Brand is required.' })
    .positive({ message: 'Brand is required.' }),
  serialNumber: z
    .string()
    .trim()
    .min(1, { message: 'Serial number is required.' })
    .max(255, { message: 'Serial number must be 255 characters or less.' }),
  ipOrMacAddress: z
    .string()
    .trim()
    .min(1, { message: 'IP/MAC address is required.' })
    .max(255, { message: 'IP/MAC address must be 255 characters or less.' }),
  locationId: z.coerce
    .number({ message: 'Location is required.' })
    .int({ message: 'Location is required.' })
    .positive({ message: 'Location is required.' }),
  note: z
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
  pillar: z.literal('Office Electronics'),
});

export type OfficeElectronicsRegistrationInput = z.infer<
  typeof officeElectronicsRegistrationSchema
>;

export type OfficeElectronicsRegistrationFieldErrorKey =
  | keyof OfficeElectronicsRegistrationInput
  | 'invoiceFile'
  | 'form';

export type RegisterOfficeElectronicsAssetActionState = {
  success: boolean;
  message?: string;
  assetId?: string;
  errors?: Partial<Record<OfficeElectronicsRegistrationFieldErrorKey, string[]>>;
};

export const initialRegisterOfficeElectronicsAssetActionState: RegisterOfficeElectronicsAssetActionState =
  {
    success: false,
  };
