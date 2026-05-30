import { z } from 'zod';

// ---------------------------------------------------------------------------
// Asset Edit Schema
//
// Validates ONLY the fields that are safely editable after initial registration.
// Immutable fields (assetTag, serialNumber, category, brand, model, financials,
// SAM data) are intentionally excluded — they cannot be sent to the server.
// ---------------------------------------------------------------------------

export const editAssetSchema = z.object({
  // Asset Name (all pillars)
  name: z
    .string()
    .trim()
    .min(1, { message: 'Asset name is required.' })
    .max(255, { message: 'Asset name must be 255 characters or less.' })
    .optional(),

  // Condition (Hardware, Furniture, Electronics — not Software)
  condition: z
    .enum(['New', 'Excellent', 'Fair', 'Poor', 'Damaged'], {
      message: 'Condition must be a valid option.',
    })
    .nullable()
    .optional(),

  // Location FK (Furniture, Electronics)
  locationId: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return null;
      return value;
    },
    z.coerce
      .number({ message: 'Location must be a valid selection.' })
      .int()
      .positive()
      .nullable()
      .optional()
  ),

  // Owner FK (all non-Software)
  ownerId: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return null;
      return value;
    },
    z.coerce
      .number({ message: 'Owner must be a valid selection.' })
      .int()
      .positive()
      .nullable()
      .optional()
  ),

  // Warranty Expiry date (ISO string like "2027-06-15")
  warrantyExpiry: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    },
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Warranty expiry must be a valid date (YYYY-MM-DD).',
      })
      .nullable()
      .optional()
  ),

  // Instance Attributes (dynamic JSONB specs — values only, keys are fixed)
  instanceAttributes: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional(),
});

export type EditAssetInput = z.infer<typeof editAssetSchema>;

// ---------------------------------------------------------------------------
// Action State
// ---------------------------------------------------------------------------

export type EditAssetActionState = {
  success: boolean;
  message?: string;
  errors?: Partial<Record<string, string[]>>;
};

export const initialEditAssetActionState: EditAssetActionState = {
  success: false,
};
