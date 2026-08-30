import { defineConfig } from 'drizzle-kit';

// Side-effect import: drizzle-kit runs outside Next.js, so the .env files must
// be loaded before `serverEnv` is evaluated.
import './src/lib/load-env';
import { serverEnv } from './src/lib/env';

export default defineConfig({
  schema: './src/db/schema.ts', // Where the tables live
  out: './src/db/migrations', // Where the generated migration files go
  dialect: 'postgresql', // The modern V30+ way to specify Postgres
  dbCredentials: {
    url: serverEnv.DATABASE_URL, // Neon connection string
  },
  verbose: true,
  strict: true,
});
