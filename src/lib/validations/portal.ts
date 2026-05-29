import { z } from 'zod';

export const acceptAssignmentSchema = z.object({
  assignmentId: z.number().int().positive(),
});

export const rejectAssignmentSchema = z.object({
  assignmentId: z.number().int().positive(),
  reason: z.string().min(10).max(500),
});

export type AcceptAssignmentPayload = z.infer<typeof acceptAssignmentSchema>;
export type RejectAssignmentPayload = z.infer<typeof rejectAssignmentSchema>;
