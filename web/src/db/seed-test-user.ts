import bcrypt from "bcryptjs"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { eq } from "drizzle-orm"
import * as dotenv from "dotenv"

import { users } from "./schema"

dotenv.config({ path: ".env.local" })

const TEST_USER_EMAIL = "test.user@tiqri.com"
const TEST_USER_PASSWORD = "Test@1234"

async function seedTestUser() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing in .env.local")
  }

  const sql = neon(databaseUrl)
  const db = drizzle(sql)

  const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10)

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, TEST_USER_EMAIL))
    .limit(1)

  if (existingUser.length > 0) {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, TEST_USER_EMAIL))

    console.log(`Updated test user: ${TEST_USER_EMAIL}`)
  } else {
    await db.insert(users).values({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
    })

    console.log(`Created test user: ${TEST_USER_EMAIL}`)
  }

  console.log("Test user password:", TEST_USER_PASSWORD)
}

seedTestUser().catch((error) => {
  console.error("Failed to seed test user:", error)
  process.exitCode = 1
})