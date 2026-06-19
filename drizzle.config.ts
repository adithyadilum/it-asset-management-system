import { defineConfig } from 'drizzle-kit';
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
