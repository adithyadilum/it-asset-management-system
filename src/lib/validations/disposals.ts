import { z } from 'zod';

// ─── Receipt URL domain allowlist ──────────────────────────────────────────
// Only accept URLs from the Vercel Blob storage hostname to prevent injection
// of external URLs into the assetDocuments table.
const ALLOWED_BLOB_HOSTNAMES = ['public.blob.vercel-storage.com'];

function isAllowedBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_BLOB_HOSTNAMES.some((host) =>
      parsed.hostname.endsWith(host)
    );
  } catch {
    return false;
  }
}

const receiptUrlSchema = z
  .string()
  .url('A valid receipt URL is required.')
  .refine(isAllowedBlobUrl, {
    message: 'Receipt URL must be from an authorized storage provider.',
  });

const receiptUrlsSchema = z.array(receiptUrlSchema);

// ─── Create Disposal Request Schema ─────────────────────────────────────────
// Used by createDisposalRequest server action.
export const createDisposalRequestSchema = z.object({
  assetIds: z
    .array(z.string().uuid('Invalid asset ID format.'))
    .min(1, 'Select at least one asset.'),
  reason: z
    .string()
    .trim()
    .min(1, 'Reason is required.')
    .max(500, 'Reason is too long.'),
  justification: z
    .string()
    .trim()
    .max(2000, 'Justification is too long.')
    .optional()
    .transform((val) => val ?? null),
});

// ─── Execute Disposal Schema ─────────────────────────────────────────────────
// Used by executeAssetDisposal server action.
// receiptUrls is optional — document upload is not required to complete disposal.
export const executeDisposalSchema = z.object({
  disposalIds: z
    .array(z.coerce.number().int().positive())
    .min(1, 'No disposals selected.'),
  // strictly validate UUIDs
  assetIds: z
    .array(z.string().uuid('Invalid asset ID format.'))
    .min(1, 'No assets selected.'),
  reason: z.string().min(1, 'Reason is required.'),
  // validate ISO date or datetime
  disposalDate: z
    .string()
    .refine(
      (value) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value)),
      {
        message: 'Disposal date must be a valid ISO date or datetime.',
      }
    )
    .optional(),
  disposalMethod: z.enum(['Sold', 'Stolen', 'E-waste', 'Donated'], {
    message: 'Invalid disposal method selected.',
  }),
  dataWiped: z.boolean().refine((val) => val === true, {
    message: 'You must confirm the data is wiped.',
  }),
  tagsRemoved: z.boolean().refine((val) => val === true, {
    message: 'You must confirm physical tags are removed.',
  }),
  actualSalvageValue: z.coerce
    .number()
    .min(0, 'Salvage value must be non-negative.')
    .optional(),
  // Upload is optional — an empty array is acceptable
  receiptUrls: receiptUrlsSchema.optional().default([]),
});

// ─── Reject Disposal Schema ───────────────────────────────────────────────────
// Used by rejectDisposalRequest server action.
export const rejectDisposalSchema = z
  .object({
    disposalIds: z
      .array(z.coerce.number().int().positive())
      .min(1, 'No disposals selected.'),
    // strictly validate UUIDs
    assetIds: z
      .array(z.string().uuid('Invalid asset ID format.'))
      .min(1, 'No assets selected.'),
    rejectionReason: z
      .string()
      .trim()
      .min(10, 'Rejection reason must be at least 10 characters long.')
      .max(1000, 'Rejection reason is too long.'),
    fallbackStatus: z.enum(['Available', 'In Repair'], {
      message: 'Invalid fallback status.',
    }),
    maintenanceIssue: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.fallbackStatus === 'In Repair' &&
      (!data.maintenanceIssue || data.maintenanceIssue.trim() === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Maintenance issue description is required when routing to repair.',
        path: ['maintenanceIssue'],
      });
    }
  });
