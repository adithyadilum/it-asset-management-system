import { z } from 'zod';

export const getNotificationsParamsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1.')
    .max(100, 'Limit must not exceed 100.')
    .optional()
    .default(10),
  offset: z
    .number()
    .int()
    .min(0, 'Offset must be at least 0.')
    .optional()
    .default(0),
});

export const markAsReadParamsSchema = z.object({
  id: z.string().uuid('Invalid notification ID format.'),
});

export type GetNotificationsParams = z.infer<
  typeof getNotificationsParamsSchema
>;
export type MarkAsReadParams = z.infer<typeof markAsReadParamsSchema>;
