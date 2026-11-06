import { z } from 'zod';
import { processReturnPayloadSchema } from './asset-assignment';

export const mobileTaskKinds = [
  'handovers',
  'returns',
  'inspections',
  'maintenance',
  'renewals',
  'warranties',
  'disposals',
] as const;
export const mobileTasksQuerySchema = z.object({
  kind: z.enum(mobileTaskKinds).optional(),
  query: z.string().trim().max(120).default(''),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export const mobileRecipientsQuerySchema = z.object({
  type: z.enum(['user', 'location']).default('user'),
  query: z.string().trim().max(120).default(''),
});
const revision = z.string().datetime();
const expectedDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      value >=
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Colombo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date())
    );
  }, 'Choose a real date today or later.');
export const mobileHandoverSchema = z
  .object({
    assetId: z.string().uuid(),
    expectedUpdatedAt: revision,
    assignmentType: z.enum(['user', 'location']),
    targetId: z.union([z.string().uuid(), z.number().int().positive()]),
    expectedReturnDate: expectedDate.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.assignmentType === 'user') !==
      (typeof value.targetId === 'string')
    )
      context.addIssue({
        code: 'custom',
        path: ['targetId'],
        message: 'Select a valid recipient for this handover.',
      });
  });
export const mobileAssignmentActionSchema = z.object({
  action: z.enum(['request-return', 'receive', 'remind']),
  assetId: z.string().uuid(),
  expectedUpdatedAt: revision,
});
export const mobileInspectionSchema = processReturnPayloadSchema.extend({
  expectedUpdatedAt: revision,
  notes: z.string().trim().max(2000).optional(),
});
