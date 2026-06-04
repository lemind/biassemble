import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

  // Batch of 2-5 AI-generated questions (array of strings)
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

  // Version tracking — stamped from AI Core response
  promptVersion: text("prompt_version"),
  schemaVersion: text("schema_version"),
});

// ── Runs ──
// Each run represents one assessment pass (initial or post-questions).
export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  modelName: text("model_name").notNull(),
  stage: text("stage", { enum: ["initial_assessment", "post_questions_assessment"] }).notNull(),
  scope: text("scope", { enum: ["story_only", "story_plus_answers"] }).notNull(),
  promptVersion: text("prompt_version").notNull(),
  inputHash: text("input_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Reasoning Traces ──
// Immutable reasoning artifacts produced by each run.
export const reasoningTraces = pgTable("reasoning_traces", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  trace: jsonb("trace").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Evaluation Results ──
// Results from running golden/no_bias datasets against a prompt version.
export const evalResults = pgTable("eval_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  modelName: text("model_name").notNull(),
  promptVersion: text("prompt_version").notNull(),
  dataset: text("dataset", { enum: ["golden", "no_bias", "all"] }).notNull(),
  evaluationMetrics: jsonb("evaluation_metrics").notNull(),
  systemMetrics: jsonb("system_metrics").notNull(),
  inputHash: text("input_hash").notNull(),
  passed: boolean("passed").notNull(),
  runAt: timestamp("run_at").defaultNow().notNull(),
});

// ── Type exports ──
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type SessionData = typeof sessionData.$inferSelect;
export type NewSessionData = typeof sessionData.$inferInsert;

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

export type ReasoningTrace = typeof reasoningTraces.$inferSelect;
export type NewReasoningTrace = typeof reasoningTraces.$inferInsert;

export type EvalResult = typeof evalResults.$inferSelect;
export type NewEvalResult = typeof evalResults.$inferInsert;
