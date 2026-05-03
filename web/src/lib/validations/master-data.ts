import { z } from 'zod';

import { LOCATION_TYPES } from '@/types/master-data';

const pillarSchema = z.enum([
  'IT & Digital',
  'Software',
  'Office Furniture',
  'Office Electronics',
]);

const customAttributeSchema = z.object({
  fieldName: z.string().trim().min(1, 'Field name is required'),
  inputType: z.enum(['Text', 'Number', 'Date', 'Dropdown', 'Boolean']),
  required: z.boolean().default(false),
});

const categoryCustomSchemaShape = z
  .object({
    modelSpecs: z.array(customAttributeSchema),
    assetTracking: z.array(customAttributeSchema),
  })
  .strict();

const technicalDetailsSchema = z
  .string()
  .transform((value, ctx) => {
    try {
      return JSON.parse(value);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid technical details JSON',
      });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .record(z.string(), z.string())
      .refine(
        (record) =>
          Object.entries(record).every(
            ([key, fieldValue]) =>
              key.trim().length > 0 && fieldValue.trim().length > 0
          ),
        {
          message: 'Technical details must contain non-empty keys and values.',
        }
      )
  );

export const brandSchema = z.object({
  name: z.string().trim().min(2, 'Brand name is required'),
  isActive: z.boolean(),
});

const parentLocationIdSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();
  if (normalized.length === 0) {
    return undefined;
  }

  const numeric = Number(normalized);
  return Number.isNaN(numeric) ? value : numeric;
}, z.number().int().positive('Parent location is invalid').optional());

export const locationSchema = z.object({
  name: z.string().trim().min(2, 'Location name is required'),
  type: z.enum(LOCATION_TYPES),
  parentId: parentLocationIdSchema,
  isActive: z.boolean(),
});

export const vendorSchema = z.object({
  companyName: z.string().trim().min(2, 'Vendor name is required'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string().trim().max(50, 'Phone number is too long').optional(),
  website: z
    .string()
    .trim()
    .url('Enter a valid website URL')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean(),
});

export const ownerSchema = z.object({
  companyName: z.string().trim().min(2, 'Owner name is required'),
  isActive: z.boolean(),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name is required'),
  shortCode: z
    .string()
    .trim()
    .min(1, 'Department code is required')
    .max(50, 'Department code is too long')
    .transform((value) => value.toUpperCase()),
  costCenterId: z.string().trim().min(2, 'Cost center id is required'),
  isActive: z.boolean(),
});

export const deviceModelSchema = z.object({
  name: z.string().trim().min(2, 'Model name is required'),
  brandId: z.coerce.number().int().positive('Brand is required'),
  categoryId: z.coerce.number().int().positive('Category is required'),
  imageUrl: z
    .string()
    .trim()
    .url('Image URL must be a valid URL')
    .optional()
    .or(z.literal('')),
  technicalDetails: technicalDetailsSchema,
  isActive: z.boolean(),
});

export const categorySchema = z.object({
  pillar: pillarSchema,
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
    .pipe(categoryCustomSchemaShape),
});

export const customStatusSchema = z.object({
  name: z.string().trim().min(2, 'Status name is required'),
  iconName: z.string().min(1, 'Icon is required'),
  colorTheme: z.string().min(1, 'Color theme is required'),
  isActive: z.boolean(),
});
