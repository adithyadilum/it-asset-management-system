import { z } from 'zod';

// ---------------------------------------------------------------------------
// getAuditLogs params
// ---------------------------------------------------------------------------

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(16),
  search: z.string().trim().max(500).optional(),
  filters: z
    .array(
      z.object({
        field: z.enum([
          'Action Taken',
          'User',
          'Target Entity',
          'IP Address',
          'Event Details',
        ]),
        operator: z.enum(['is', 'is not']),
        value: z.string().trim().min(1),
      })
    )
    .optional(),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
