// Drizzle ORM schema — Phase 2 stub
// Full tables (sessions, stories, questions, answers, assessments) defined in Phase 3 (T022)

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Placeholder: single "sessions" table for now to verify Drizzle config works
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: text("status").notNull().default("created"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;