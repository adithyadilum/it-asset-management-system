// web/src/lib/validations/disposals.ts
import { z } from 'zod';

const receiptUrlSchema = z.string().url('A valid receipt URL is required.');
const receiptUrlsSchema = z
  .array(receiptUrlSchema)
  .min(1, 'At least one valid receipt URL is required.');

// Schema for the Execute Disposal Action
export const executeDisposalSchema = z
  .object({
    disposalIds: z.array(z.coerce.number().int().positive()).min(1, 'No disposals selected.'),
    // strictly validate UUIDs
    assetIds: z.array(z.string().uuid('Invalid asset ID format.')).min(1, 'No assets selected.'),
    reason: z.string().min(1, 'Reason is required.'), 
    //validate ISO date or datetime
    disposalDate: z
      .string()
      .refine(
        (value) =>
          /^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isNaN(Date.parse(value)),
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
    // Support for both single and multiple receipt URLs
    receiptUrl: receiptUrlSchema.optional(),
    receiptUrls: receiptUrlsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.receiptUrl && !data.receiptUrls?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one valid receipt URL is required.',
        path: ['receiptUrls'],
      });
    }
  })
  .transform((data) => {
    const normalizedReceiptUrls = data.receiptUrls ?? (data.receiptUrl ? [data.receiptUrl] : []);

    return {
      ...data,
      receiptUrl: data.receiptUrl ?? normalizedReceiptUrls[0],
      receiptUrls: normalizedReceiptUrls,
    };
  });

// Schema for the Reject Disposal Action
export const rejectDisposalSchema = z
  .object({
    disposalIds: z.array(z.coerce.number().int().positive()).min(1, 'No disposals selected.'),
    // strictly validate UUIDs
    assetIds: z.array(z.string().uuid('Invalid asset ID format.')).min(1, 'No assets selected.'),
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
        if (data.fallbackStatus === 'In Repair' && (!data.maintenanceIssue || data.maintenanceIssue.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maintenance issue description is required when routing to repair.',
        path: ['maintenanceIssue'],
      });
    }
  });