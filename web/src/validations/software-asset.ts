import { z } from 'zod';

export const SOFTWARE_AGREEMENT_TYPES = [
  'perpetual',
  'subscription',
  'trial',
  'enterprise',
  'open-source',
] as const;

export const SOFTWARE_PAYMENT_MODELS = [
  'one-time',
  'monthly',
  'annual',
  'per-seat',
  'enterprise',
] as const;

export const softwareRegistrationSchema = z.object({
  softwareName: z
    .string()
    .trim()
    .min(1, { message: 'Software name is required.' })
    .max(255, { message: 'Software name must be 255 characters or less.' }),
  categoryId: z.coerce
    .number({ message: 'Category is required.' })
    .int({ message: 'Category is required.' })
    .positive({ message: 'Category is required.' }),
  publisherId: z.coerce
    .number({ message: 'Publisher is required.' })
    .int({ message: 'Publisher is required.' })
    .positive({ message: 'Publisher is required.' }),
  agreementType: z.enum(SOFTWARE_AGREEMENT_TYPES, {
    message: 'Agreement type is required.',
  }),
  paymentModel: z.enum(SOFTWARE_PAYMENT_MODELS, {
    message: 'Payment model is required.',
  }),
  licenseKey: z
    .string()
    .trim()
    .min(1, { message: 'License key is required.' })
    .max(255, { message: 'License key must be 255 characters or less.' }),
  licenseEmail: z
    .string()
    .trim()
    .email({ message: 'Licensed email is invalid.' })
    .max(255, { message: 'Licensed email must be 255 characters or less.' }),
  totalSeats: z.coerce
    .number({ message: 'Total seats is required.' })
    .int({ message: 'Total seats must be a whole number.' })
    .min(1, { message: 'Total seats must be at least 1.' }),
  purchaseDate: z
    .string()
    .trim()
    .min(1, { message: 'Purchase date is required.' })
    .pipe(z.coerce.date({ message: 'Purchase date is invalid.' })),
  basePrice: z.coerce
    .number({ message: 'Base price is required.' })
    .nonnegative({ message: 'Base price must be 0 or more.' }),
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
  notes: z
    .string()
    .trim()
    .max(2_000, { message: 'Notes must be 2000 characters or less.' })
    .optional(),
  pillar: z.literal('Software'),
});

export type SoftwareRegistrationInput = z.infer<typeof softwareRegistrationSchema>;

export type SoftwareRegistrationFieldErrorKey =
  | keyof SoftwareRegistrationInput
  | 'invoiceFile'
  | 'form';

export type RegisterSoftwareAssetActionState = {
  success: boolean;
  message?: string;
  assetId?: string;
  errors?: Partial<Record<SoftwareRegistrationFieldErrorKey, string[]>>;
};

export const initialRegisterSoftwareAssetActionState: RegisterSoftwareAssetActionState = {
  success: false,
};