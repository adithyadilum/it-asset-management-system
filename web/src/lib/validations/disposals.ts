// web/src/lib/validations/disposals.ts
import { z } from 'zod';

// Schema for the Execute Disposal Action
export const executeDisposalSchema = z.object({
  disposalId: z.coerce.number().int().positive(),
  assetId: z.string().min(1, 'Asset ID is required'),
  disposalMethod: z.enum(['Sold', 'Stolen', 'E-waste', 'Donated'], {
    message: 'Invalid disposal method selected.',
  }),
  dataWiped: z.boolean().refine((val) => val === true, {
    message: 'You must confirm the data is wiped.',
  }),
  tagsRemoved: z.boolean().refine((val) => val === true, {
    message: 'You must confirm physical tags are removed.',
  }),
  receiptUrl: z.string().url('A valid receipt URL is required.'),
});

// Schema for the Reject Disposal Action
export const rejectDisposalSchema = z.object({
  disposalId: z.coerce.number().int().positive(),
  assetId: z.string().min(1, 'Asset ID is required'),
  rejectionReason: z
    .string()
    .trim()
    .min(10, 'Rejection reason must be at least 10 characters long.')
    .max(1000, 'Rejection reason is too long.'),
  fallbackStatus: z.enum(['Available', 'In Repair'], {
    message: 'Invalid fallback status.',
  }),
});