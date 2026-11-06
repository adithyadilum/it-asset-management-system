import { z } from 'zod';
import { DAY_MS, reportDate } from '@/lib/reporting-time';

export const financialDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, 'Enter a valid calendar date.');
export const perHeadQuerySchema = z
  .object({
    from: financialDate,
    to: financialDate,
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(16),
    search: z.string().trim().max(200).default(''),
    groupId: z.number().int().positive().optional(),
    category: z.string().max(255).optional(),
    pillar: z
      .enum(['Hardware', 'Software', 'Office Furniture', 'Office Electronics'])
      .optional(),
    sort: z.enum(['cost', 'name', 'value']).default('cost'),
  })
  .refine(
    (q) =>
      reportDate(q.to) >= reportDate(q.from) &&
      reportDate(q.to) - reportDate(q.from) <= DAY_MS * 366 * 5,
    'Choose a range of at most five years.'
  );
export type PerHeadQuery = z.input<typeof perHeadQuerySchema>;
const interval = {
  validFrom: financialDate,
  validTo: financialDate.optional(),
  id: z.number().int().positive().optional(),
};
export const membershipSchema = z
  .object({
    ...interval,
    groupId: z.number().int().positive(),
    email: z.string().email(),
    reason: z.string().trim().min(1).max(1000),
  })
  .refine(
    (v) => !v.validTo || v.validTo > v.validFrom,
    'End must follow start.'
  );
export const costPolicySchema = z
  .object({
    ...interval,
    assetTag: z.string().trim().min(1).max(100),
    groupId: z.number().int().positive(),
    shared: z.boolean(),
  })
  .refine(
    (v) => !v.validTo || v.validTo > v.validFrom,
    'End must follow start.'
  );
export const softwareTermSchema = z
  .object({
    ...interval,
    assetTag: z.string().trim().min(1).max(100),
    validTo: financialDate,
    amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
    currency: z.enum(['LKR', 'USD', 'NOK']),
    exchangeRate: z
      .string()
      .regex(/^\d{1,9}(\.\d{1,6})?$/)
      .optional(),
    seats: z.number().int().min(1).max(100000),
    allocationLifeMonths: z.number().int().min(1).max(1200).optional(),
    sourcePurchaseId: z.number().int().positive().optional(),
  })
  .refine((v) => v.validTo > v.validFrom, 'End must follow start.');
