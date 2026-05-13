import { z } from 'zod';

const assignmentTypeSchema = z.enum(['user', 'location']);

const expectedReturnDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, {
    message: "Select a valid date",
  })
  .optional();

const notesSchema = z.string().max(2000).optional();

const targetIdSchema = z.union([
  z.string().min(1),
  z.number().int().positive(),
]);

export const assignAssetPayloadSchema = z.object({
  assignmentType: assignmentTypeSchema,
  targetId: targetIdSchema,
  expectedReturnDate: expectedReturnDateSchema,
  notes: notesSchema,
});

export const bulkAssignAssetsPayloadSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1),
  assignmentType: assignmentTypeSchema,
  targetId: targetIdSchema,
  expectedReturnDate: expectedReturnDateSchema,
  notes: notesSchema,
});

export const operationsAssignmentsQuerySchema = z.object({
  tab: z.enum(['available', 'assigned', 'returned']).optional(),
});

export type AssignAssetPayload = z.infer<typeof assignAssetPayloadSchema>;
export type BulkAssignAssetsPayload = z.infer<typeof bulkAssignAssetsPayloadSchema>;
