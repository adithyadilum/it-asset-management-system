import { z } from 'zod';
import { isAllowedWebhookDestination } from '@/lib/webhooks/validate-destination';
import { API_KEY_SCOPES, WEBHOOK_EVENT_TYPES } from '@/types/integrations';

export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(3, 'API key name must be at least 3 characters long')
    .max(100),
  scopes: z
    .array(z.enum([...API_KEY_SCOPES] as [string, ...string[]]))
    .min(1, 'Select at least one scope'),
  expiresAt: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date',
    }),
});

export const createWebhookSchema = z.object({
  name: z.string().min(3).max(100),
  url: z
    .string()
    .url()
    .refine((v) => v.startsWith('https://'), { message: 'URL must use HTTPS' })
    .refine(isAllowedWebhookDestination, {
      message:
        'URL must be a public host, and on the configured allowlist if one is set',
    }),
  events: z
    .array(z.enum([...WEBHOOK_EVENT_TYPES] as [string, ...string[]]))
    .min(1, 'Select at least one event'),
});

export const updateWebhookSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  url: z
    .string()
    .url()
    .optional()
    .refine((v) => !v || v.startsWith('https://'), {
      message: 'URL must use HTTPS',
    })
    .refine((v) => !v || isAllowedWebhookDestination(v), {
      message:
        'URL must be a public host, and on the configured allowlist if one is set',
    }),
  events: z
    .array(z.enum([...WEBHOOK_EVENT_TYPES] as [string, ...string[]]))
    .min(1)
    .optional(),
  isActive: z.boolean().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
