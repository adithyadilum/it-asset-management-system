import { boolean, integer, pgTable, serial, text, timestamp, varchar, pgEnum } from "drizzle-orm/pg-core";

//Define the strict Role Enum
export const roleEnum = pgEnum("role", ["GlobalAdmin", "ITOperator", "FinanceAuditor", "Employee"]);

//Users Table (Updated)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  // Enforce least-privilege: Everyone is an Employee by default
  role: roleEnum("role").default("Employee").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenId: text("token_id").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});