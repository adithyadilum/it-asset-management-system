import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Tell Drizzle to read from the local environment file
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts', // Where the tables live
  out: './src/db/migrations', // Where the generated migration files go
  dialect: 'postgresql', // The modern V30+ way to specify Postgres
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Neon connection string
  },
  verbose: true,
  strict: true,
});
