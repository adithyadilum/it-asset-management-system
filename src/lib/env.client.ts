import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_NOTIFICATION_POLL_INTERVAL: z.coerce.number().int().positive().default(30000),
  NEXT_PUBLIC_PUSHER_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().min(1).default('ap1'),
  NEXT_PUBLIC_ENABLE_SANDBOX: z.enum(['true', 'false']).default('false'),
});

const result = clientEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_NOTIFICATION_POLL_INTERVAL: process.env.NEXT_PUBLIC_NOTIFICATION_POLL_INTERVAL,
  NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
  NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  NEXT_PUBLIC_ENABLE_SANDBOX: process.env.NEXT_PUBLIC_ENABLE_SANDBOX,
});

if (!result.success) {
  console.error('❌ Invalid client environment variables:');
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  throw new Error('Invalid client environment variables. Fix them in .env or .env.local');
}

export const clientEnv = result.data;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
