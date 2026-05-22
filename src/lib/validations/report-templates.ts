import { z } from 'zod';

export const reportTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Report name is required.')
    .max(255, 'Report name must be 255 characters or fewer.'),
  description: z.string().max(1000).optional(),
  isActive: z.boolean(),
  dataSource: z
    .string()
    .min(1, 'Primary data source is required.'),
  filters: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    category: z.string().optional(),
    location: z.string().optional(),
    status: z.string().optional(),
    assetType: z.string().optional(),
    masterDataType: z.string().optional(),
  }),
  fields: z
    .array(z.string())
    .min(1, 'At least one report field must be selected.'),
  sortDirection: z.enum(['asc', 'desc']),
});

export type ReportTemplateFormData = z.infer<typeof reportTemplateSchema>;
