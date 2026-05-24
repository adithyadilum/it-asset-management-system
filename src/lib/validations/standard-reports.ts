import { z } from 'zod';

// ---------------------------------------------------------------------------
// fetchReportPreview filters
// ---------------------------------------------------------------------------

export const reportPreviewFiltersSchema = z.object({
  source: z.string().trim().min(1).optional(),
  assetType: z.string().trim().optional(),
  category: z.string().trim().optional(),
  location: z.string().trim().optional(),
  status: z.string().trim().optional(),
  masterDataType: z.string().trim().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom must be in YYYY-MM-DD format.')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo must be in YYYY-MM-DD format.')
    .optional(),
  page: z.coerce.number().int().min(0).optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(16),
});

export type ReportPreviewFilters = z.infer<typeof reportPreviewFiltersSchema>;
