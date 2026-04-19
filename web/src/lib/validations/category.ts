// src/lib/validations/category.ts
import { z } from 'zod';

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Category name must be at least 2 characters.' }),
  // Zod can transform data on the fly! Here we force the prefix to uppercase.
  prefix: z
    .string()
    .length(3, { message: 'Prefix must be exactly 3 letters.' })
    .toUpperCase(),
  pillar: z.enum([
    'IT & Digital',
    'Software',
    'Office Furniture',
    'Office Electronics',
  ]),
  requiresSerial: z.boolean().default(true),
});
