import { z } from 'zod';

export const inventoryQuerySchema = z.object({
  query: z.string().trim().max(120).default(''),
  operation: z.enum(['handover', 'return']).optional(),
  pillar: z
    .enum(['Hardware', 'Software', 'Office Furniture', 'Office Electronics'])
    .optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  status: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
