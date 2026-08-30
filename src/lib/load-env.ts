import * as dotenv from 'dotenv';
import path from 'path';

/**
 * Loads `.env.local` and `.env` for processes Next.js does not start.
 *
 * Next.js loads these files itself for the application and for `next.config.ts`,
 * so app code must never import this module. Standalone scripts run through
 * `tsx` (database seeds, one-off migrations) and `drizzle.config.ts` get no such
 * treatment, and this fills that gap for them.
 *
 * It lives apart from `env.ts` because it uses `dotenv`, `path`, and
 * `process.cwd()` — Node-only APIs. When this ran as a side effect of importing
 * `env.ts`, every module that read `serverEnv` dragged them along, including the
 * edge proxy by way of `lib/latency`, which produced:
 *
 *     A Node.js API is used (process.cwd at line: 7) which is not supported in
 *     the Edge Runtime.
 *
 * Import it for its side effect, before anything that reads `serverEnv`:
 *
 *     import './load-env';
 *     import { serverEnv } from './env';
 */
if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}
