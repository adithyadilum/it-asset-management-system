import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared Constants
// ---------------------------------------------------------------------------

export const DB_PILLAR_VALUES = [
  'Hardware',
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

export const assetRegistrationSchema = z
  .object({
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

    // Software Licensing
    licenseType: z.preprocess(
      (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z
        .enum(['Perpetual', 'Subscription', 'Open Source / Free'], {
          message: 'License type must be a valid option.',
        })
        .optional()
    ),
    billingCycle: z.preprocess(
      (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z
        .enum(['Monthly', 'Annual'], {
          message: 'Billing cycle must be monthly or annual.',
        })
        .optional()
    ),
    totalSeats: z.preprocess((value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }, z.coerce.number().int().min(1, 'Total seats must be at least 1.').optional()),
    licenseStartDate: z.preprocess(
      (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z.coerce.date({ message: 'Start date is invalid.' }).optional()
    ),
    licenseExpiryDate: z.preprocess(
      (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z.coerce.date({ message: 'Expiry date is invalid.' }).optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.pillar === 'Software') {
      if (!data.licenseType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['licenseType'],
          message: 'License type is required for software.',
        });
      }
      if (!data.totalSeats || data.totalSeats < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['totalSeats'],
          message: 'Total seats is required for software.',
        });
      }
      if (data.licenseType === 'Subscription') {
        if (!data.billingCycle) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['billingCycle'],
            message: 'Billing cycle is required for subscription licenses.',
          });
        }
        if (!data.licenseExpiryDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['licenseExpiryDate'],
            message: 'Expiry date is required for subscription licenses.',
          });
        }
      }
      if (data.licenseType === 'Perpetual' && data.licenseExpiryDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['licenseExpiryDate'],
          message: 'Perpetual licenses must not have an expiry date.',
        });
      }
      if (data.licenseType !== 'Subscription' && data.billingCycle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['billingCycle'],
          message: 'Billing cycle only applies to subscription licenses.',
        });
      }
      if (
        data.licenseType === 'Open Source / Free' &&
        (data.basePrice !== 0 ||
          (data.tax ?? 0) !== 0 ||
          (data.shippingCost ?? 0) !== 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['basePrice'],
          message: 'Free software must have a total cost of 0.',
        });
      }
      if (
        data.licenseStartDate &&
        data.licenseExpiryDate &&
        data.licenseExpiryDate < data.licenseStartDate
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['licenseExpiryDate'],
          message: 'Expiry date must be after the start date.',
        });
      }
    }
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
  Hardware: 'HRW',
  Software: 'SFT',
  'Office Furniture': 'FUR',
  'Office Electronics': 'ELC',
};

// ---------------------------------------------------------------------------
// updateAsset — partial update schema
// ---------------------------------------------------------------------------

export const updateAssetSchema = z.object({
  status: z
    .enum([
      'Available',
      'Assigned',
      'In Repair',
      'Defective',
      'Lost',
      'Retired',
      'Disposed',
    ])
    .optional(),
  condition: z
    .enum(['New', 'Excellent', 'Fair', 'Poor', 'Damaged'])
    .nullable()
    .optional(),
  name: z.string().trim().min(1).max(255).nullable().optional(),
  locationId: z.number().int().positive().nullable().optional(),
  instanceAttributes: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

// ---------------------------------------------------------------------------
// manualStatusOverrideAction — admin-only status override schema
// ---------------------------------------------------------------------------

export const manualStatusOverrideSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID.'),
  newStatus: z.string().trim().min(1, 'Status is required.'),
  reasonNote: z
    .string()
    .trim()
    .min(10, 'Justification must be at least 10 characters.')
    .max(1000, 'Justification must be 1000 characters or fewer.'),
});

export type ManualStatusOverrideInput = z.infer<
  typeof manualStatusOverrideSchema
>;
