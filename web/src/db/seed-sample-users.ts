import bcrypt from "bcryptjs"
import { neon } from "@neondatabase/serverless"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"
import * as dotenv from "dotenv"

import { users } from "./schema"

dotenv.config({ path: ".env.local" })

// 1. Updated Type to match strict Postgres Enum
type SeedUser = {
    email: string
    name: string
    role: "GlobalAdmin" | "ITOperator" | "FinanceAuditor" | "Employee"
    password: string
}

// 2. Generate the 4 exact personas needed for the Phase 1 Code Review
const SAMPLE_USERS: SeedUser[] = [
    {
        email: "admin@tiqri.com",
        name: "Admin User",
        role: "GlobalAdmin",
        password: "Admin@1234",
    },
    {
        email: "it@tiqri.com",
        name: "IT Support",
        role: "ITOperator",
        password: "IT@1234",
    },
    {
        email: "finance@tiqri.com",
        name: "Finance Auditor",
        role: "FinanceAuditor",
        password: "Finance@1234",
    },
    {
        email: "employee@tiqri.com",
        name: "Standard Employee",
        role: "Employee",
        password: "Employee@1234",
    },
]

async function seedSampleUsers() {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
        throw new Error("DATABASE_URL is missing in .env.local")
    }

    const neonClient = neon(databaseUrl)
    const db = drizzle(neonClient)

    for (const sampleUser of SAMPLE_USERS) {
        // In a real app, do not hardcode salt rounds (10), but fine for mock seeding
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

            console.log(`✅ Updated test account: ${sampleUser.email} (${sampleUser.role})`)
        } else {
            await db.insert(users).values({
                email: sampleUser.email,
                name: sampleUser.name,
                role: sampleUser.role,
                password: hashedPassword,
                isActive: true,
            })

            console.log(`Created test account: ${sampleUser.email} (${sampleUser.role})`)
        }
    }

    console.log("\nSeeded sample credentials for testing:")
    for (const sampleUser of SAMPLE_USERS) {
        console.log(`- ${sampleUser.email} / ${sampleUser.password}`)
    }
}

seedSampleUsers().catch((error) => {
    console.error("Failed to seed sample users:", error)
    process.exitCode = 1
})