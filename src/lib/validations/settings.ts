import { z } from 'zod';

export const updateNotificationRuleSchema = z.object({
  isEnabled: z.boolean(),
  thresholdDays: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),
  channelInApp: z.boolean(),
  channelEmail: z.boolean(),
  channelTeams: z.boolean(),
});

export type UpdateNotificationRuleInput = z.infer<
  typeof updateNotificationRuleSchema
>;
