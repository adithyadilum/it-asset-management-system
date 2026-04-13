"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getJwtSecretKey } from "@/lib/jwt";

const SESSION_COOKIE_NAME = "session_token";

/**
 * Helper to get the current user ID from the session cookie.
 */
async function getAuthenticatedUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return Number(payload.sub); // The 'sub' field holds the user.id
  } catch {
    return null;
  }
}

/**
 * Search for users by name or email.
 */
export async function searchUsers(query: string) {
  if (!query) return [];

  try {
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(
        or(
          ilike(users.name, `%${query}%`),
          ilike(users.email, `%${query}%`)
        )
      )
      .limit(10);

    return results;
  } catch (error) {
    console.error("Search Error:", error);
    throw new Error("Failed to search users.");
  }
}

/**
 * Assigns a new role to a user.
 */
export async function assignUserRole(
  targetUserId: number, 
  newRole: "GlobalAdmin" | "ITOperator" | "FinanceAuditor" | "Employee"
) {
  const currentUserId = await getAuthenticatedUserId();

  // Authentication Guard: Ensure the person making the request is logged in
  if (!currentUserId) {
    throw new Error("Unauthorized: You must be logged in to manage roles.");
  }

  // Anti-Lockout Guard: Scenario: Global Admin Anti-Lockout
  if (targetUserId === currentUserId) {
    throw new Error("Action Prohibited: You cannot modify your own administrative role to prevent accidental lockout.");
  }

  try {
    await db
      .update(users)
      .set({ role: newRole })
      .where(eq(users.id, targetUserId));

    // Refresh the role management page to show updated data
    revalidatePath("/admin/roles");
    
    return { success: true };
  } catch (error) {
    console.error("Assignment Error:", error);
    return { success: false, error: "Database update failed." };
  }
}