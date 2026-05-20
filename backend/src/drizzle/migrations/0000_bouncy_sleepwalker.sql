CREATE TABLE "session_data" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"story" text NOT NULL,
	"questions" jsonb NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"biases" jsonb,
	"reflection_prompt" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_data" ADD CONSTRAINT "session_data_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;