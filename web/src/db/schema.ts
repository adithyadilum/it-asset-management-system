import { pgTable, serial, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(), // Stores hashed passwords
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});