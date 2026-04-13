import bcrypt from "bcryptjs"
import { neon } from "@neondatabase/serverless"
import { eq, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"
import * as dotenv from "dotenv"

import { users } from "./schema"

dotenv.config({ path: ".env.local" })

//UPDATED: Added ITOperator and Finance to the allowed roles
type SeedUser = {
    email: string
    name: string
    role: "Admin" | "ITOperator" | "Finance" | "Employee"
    password: string
}

//UPDATED: The exact 4 users Developer 5 is required to create
const SAMPLE_USERS: SeedUser[] = [
    {
        email: "admin@tiqri.com",
        name: "System Admin",
        role: "Admin",
        password: "password123",
    },
    {
        email: "it@tiqri.com",
        name: "IT Support",
        role: "ITOperator",
        password: "password123",
    },
    {
        email: "finance@tiqri.com",
        name: "Finance Manager",
        role: "Finance",
        password: "password123",
    },
    {
        email: "employee@tiqri.com",
        name: "Standard Employee",
        role: "Employee",
        password: "password123",
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

async function seedSampleUsers() {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
        throw new Error("DATABASE_URL is missing in .env.local")
    }

    const neonClient = neon(databaseUrl)
    const db = drizzle(neonClient)

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

seedSampleUsers().catch((error) => {
    console.error("Failed to seed sample users:", error)
    process.exitCode = 1
})