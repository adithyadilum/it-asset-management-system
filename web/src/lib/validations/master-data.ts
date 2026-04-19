import { z } from 'zod';

const customAttributeSchema = z.object({
  fieldName: z.string().trim().min(1, 'Field name is required'),
  inputType: z.enum(['Text', 'Number', 'Date', 'Dropdown', 'Boolean']),
  required: z.boolean().default(false),
});

export const brandSchema = z.object({
  name: z.string().trim().min(2, 'Brand name is required'),
  isActive: z.boolean(),
});

export const categorySchema = z.object({
  pillar: z.enum([
    'IT & Digital',
    'Software',
    'Office Furniture',
    'Office Electronics',
  ]),
  name: z.string().trim().min(2, 'Category name is required'),
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{3}$/, 'Prefix must be exactly 3 alphanumeric characters'),
  customSchema: z
    .string()
    .transform((value, ctx) => {
      try {
        return JSON.parse(value);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid custom schema JSON',
        });
        return z.NEVER;
      }
    })
    .pipe(
      z.array(customAttributeSchema).min(1, 'Add at least one custom attribute')
    ),
});
