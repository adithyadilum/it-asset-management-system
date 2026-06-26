import { z } from 'zod';

// ---------------------------------------------------------------------------
// resolveIssueInternally
// ---------------------------------------------------------------------------

export const resolveIssueSchema = z.object({
  ticketId: z.number().int().positive('Invalid ticket ID.'),
  resolutionNote: z
    .string()
    .trim()
    .min(1, 'Resolution note is required.')
    .max(1000, 'Resolution note must be 1000 characters or fewer.'),
});

export type ResolveIssueInput = z.infer<typeof resolveIssueSchema>;

// ---------------------------------------------------------------------------
// initiateVendorRepair
// ---------------------------------------------------------------------------

export const initiateVendorRepairSchema = z.object({
  ticketId: z.number().int().positive('Invalid ticket ID.'),
  assetId: z.string().uuid('Invalid asset ID format.'),
  vendorId: z.coerce.number().int().positive('A valid vendor must be selected.'),
  rmaNumber: z
    .string()
    .trim()
    .max(100, 'RMA number must be 100 characters or fewer.')
    .optional(),
  estimatedCost: z.coerce
    .number()
    .nonnegative('Estimated cost must be 0 or more.')
    .optional(),
  expectedReturnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected return date must be in YYYY-MM-DD format.')
    .optional(),
});

export type InitiateVendorRepairInput = z.infer<typeof initiateVendorRepairSchema>;

// ---------------------------------------------------------------------------
// completeRepairTicket
// ---------------------------------------------------------------------------

export const completeRepairSchema = z.object({
  ticketId: z.number().int().positive('Invalid ticket ID.'),
  actualCost: z.coerce
    .number()
    .finite('Actual cost must be a valid number.')
    .nonnegative('Actual cost must be 0 or more.'),
  resolutionNotes: z
    .string()
    .trim()
    .min(1, 'Resolution notes are required.')
    .max(1000, 'Resolution notes must be 1000 characters or fewer.'),
  updateStatusTo: z.enum(['Available', 'Disposed'], {
    message: 'Status must be either Available or Disposed.',
  }),
});

export type CompleteRepairInput = z.infer<typeof completeRepairSchema>;

// ---------------------------------------------------------------------------
// reportDefectiveFromPanel (dispatch repair directly from detail panel)
// ---------------------------------------------------------------------------

export const panelRepairSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID format.'),
  vendorId: z.coerce.number().int().positive('A valid vendor must be selected.'),
  rmaNumber: z
    .string()
    .trim()
    .max(100, 'RMA number must be 100 characters or fewer.')
    .optional(),
  estimatedCost: z.coerce
    .number()
    .nonnegative('Estimated cost must be 0 or more.')
    .optional(),
  expectedReturnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected return date must be in YYYY-MM-DD format.')
    .optional(),
});

export type PanelRepairInput = z.infer<typeof panelRepairSchema>;

// ---------------------------------------------------------------------------
// getRepairHistory (pagination parameter bounds)
// ---------------------------------------------------------------------------

export const getRepairHistoryParamsSchema = z.object({
  page: z.number().int().min(1, 'Page must be 1 or greater.'),
  pageSize: z
    .number()
    .int()
    .min(1, 'Page size must be at least 1.')
    .max(100, 'Page size must not exceed 100.'),
  searchTerm: z
    .string()
    .trim()
    .max(200, 'Search term must be 200 characters or fewer.')
    .optional()
    .default(''),
});

export type GetRepairHistoryParams = z.infer<typeof getRepairHistoryParamsSchema>;

// ---------------------------------------------------------------------------
// getAssetMaintenanceHistory (limit parameter bounds)
// ---------------------------------------------------------------------------

export const getAssetMaintenanceHistoryParamsSchema = z.object({
  assetId: z
    .string()
    .trim()
    .min(1, 'Asset ID is required.')
    .max(100, 'Asset ID must be 100 characters or fewer.'),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1.')
    .max(100, 'Limit must not exceed 100.'),
});

export type GetAssetMaintenanceHistoryParams = z.infer<
  typeof getAssetMaintenanceHistoryParamsSchema
>;
