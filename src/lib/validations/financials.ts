import { z } from 'zod';

// ---------------------------------------------------------------------------
// Base Ledger Query Parameters
// ---------------------------------------------------------------------------

export const ledgerQueryParamsSchema = z.object({
  page: z
    .number()
    .int()
    .min(1, 'Page must be 1 or greater.')
    .optional()
    .default(1),
  pageSize: z
    .number()
    .int()
    .min(1, 'Page size must be at least 1.')
    .optional()
    .default(16)
    .transform((value) => Math.min(value, 1000)),
  search: z
    .string()
    .trim()
    .max(200, 'Search term must be 200 characters or fewer.')
    .optional(),
  category: z
    .string()
    .trim()
    .max(100, 'Category name must be 100 characters or fewer.')
    .optional(),
});

export type LedgerQueryParams = z.infer<typeof ledgerQueryParamsSchema>;

// ---------------------------------------------------------------------------
// Depreciation Ledger Parameters
// ---------------------------------------------------------------------------

export const depreciationLedgerParamsSchema = ledgerQueryParamsSchema.extend({
  ageFilter: z
    .enum(['All', 'This Year', 'Last Year', 'Older than 3 Years'], {
      message: 'Invalid age filter.',
    })
    .optional(),
});

export type DepreciationLedgerParams = z.infer<typeof depreciationLedgerParamsSchema>;

// ---------------------------------------------------------------------------
// TCO Ledger Parameters
// ---------------------------------------------------------------------------

export const tcoLedgerParamsSchema = ledgerQueryParamsSchema.extend({
  costFilter: z
    .enum(
      [
        'All',
        'High Value (>$1000)',
        'Medium Value ($500-$1000)',
        'Low Value (<$500)',
      ],
      {
        message: 'Invalid cost filter.',
      }
    )
    .optional(),
});

export type TCOLedgerParams = z.infer<typeof tcoLedgerParamsSchema>;

// ---------------------------------------------------------------------------
// Write-Offs & Salvage Ledger Parameters
// ---------------------------------------------------------------------------

export const writeOffsLedgerParamsSchema = ledgerQueryParamsSchema.extend({
  salvageFilter: z
    .enum(
      [
        'All',
        'Zero Salvage ($0)',
        'Low Salvage (<$100)',
        'High Salvage (>$100)',
      ],
      {
        message: 'Invalid salvage filter.',
      }
    )
    .optional(),
});

export type WriteOffsLedgerParams = z.infer<typeof writeOffsLedgerParamsSchema>;
