import { z } from 'zod';

export const omniSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120, { message: 'Query is too long.' })
    .optional()
    .default(''),
});
