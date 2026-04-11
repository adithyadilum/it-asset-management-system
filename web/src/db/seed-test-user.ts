import bcrypt from "bcryptjs"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { eq, sql } from "drizzle-orm"
import * as dotenv from "dotenv"

import { users } from "./schema"

dotenv.config({ path: ".env.local" })

type SeedUser = {
  email: string
  name: string
  role: "Admin" | "Employee"
  password: string
}

const SAMPLE_USERS: SeedUser[] = [
  {
    email: "admin.user@tiqri.com",
    name: "Admin User",
    role: "Admin",
    password: "Admin@1234",
  },
  {
    email: "employee.one@tiqri.com",
    name: "Employee One",
    role: "Employee",
    password: "Employee@1234",
  },
  {
    email: "employee.two@tiqri.com",
    name: "Employee Two",
    role: "Employee",
    password: "Employee@5678",
  },
  {
    email: "test.user@tiqri.com",
    name: "Test User",
    role: "Employee",
    password: "Test@1234",
  },
]

async function ensureAuthSchema(db: ReturnType<typeof drizzle>) {
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" text NOT NULL DEFAULT 'User'`)
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" text NOT NULL DEFAULT ''`)
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar(50) NOT NULL DEFAULT 'Employee'`)
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`)
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now()`)
  await db.execute(sql`CREATE TABLE IF NOT EXISTS "sessions" (
    "id" serial PRIMARY KEY,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token_id" text NOT NULL UNIQUE,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "revoked_at" timestamp with time zone
  )`)
}

async function seedTestUser() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing in .env.local")
  }

  const sql = neon(databaseUrl)
  const db = drizzle(sql)

  await ensureAuthSchema(db)

  for (const sampleUser of SAMPLE_USERS) {
    const hashedPassword = await bcrypt.hash(sampleUser.password, 10)

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, sampleUser.email))
      .limit(1)

    if (existingUser.length > 0) {
      await db
        .update(users)
        .set({
          name: sampleUser.name,
          role: sampleUser.role,
          password: hashedPassword,
          isActive: true,
        })
        .where(eq(users.email, sampleUser.email))

      console.log(`Updated sample user: ${sampleUser.email}`)
    } else {
      await db.insert(users).values({
        email: sampleUser.email,
        name: sampleUser.name,
        role: sampleUser.role,
        password: hashedPassword,
        isActive: true,
      })

      console.log(`Created sample user: ${sampleUser.email}`)
    }
  }

  console.log("Seeded sample credentials:")
  for (const sampleUser of SAMPLE_USERS) {
    console.log(`- ${sampleUser.email} / ${sampleUser.password} (${sampleUser.role})`)
  }
}

seedTestUser().catch((error) => {
  console.error("Failed to seed sample users:", error)
  process.exitCode = 1
})