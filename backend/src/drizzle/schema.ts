import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ── Sessions ──
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: text("status").notNull().default("created"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Session Data ──
// One row per session. Story, Q&A batch, and assessment all live here.
export const sessionData = pgTable("session_data", {
  sessionId: uuid("session_id")
    .notNull()
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),

  // User story text
  story: text("story").notNull(),

  // Batch of 2–5 AI-generated questions (array of strings)
  questions: jsonb("questions").$type<string[]>().notNull(),

  // User answers, same order as questions (appended one at a time)
  answers: jsonb("answers").$type<string[]>().notNull().default([]),

  // Assessment — populated asynchronously
  biases: jsonb("biases")
    .$type<
      {
        name: string;
        explanation: string;
        storyConnection: string;
        alternativePerspective: string;
      }[]
    >(),

  reflectionPrompt: text("reflection_prompt"),
});

// ── Type exports ──
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type SessionData = typeof sessionData.$inferSelect;
export type NewSessionData = typeof sessionData.$inferInsert;