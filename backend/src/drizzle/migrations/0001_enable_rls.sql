-- Enable Row-Level Security on all tables
-- This ensures data is only accessible via the service_role key (backend),
-- not through the public anon key.
--
-- IMPORTANT: Any new table added to the schema MUST follow this pattern:
--   1. ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;
--   2. CREATE POLICY "service_role_only" ON <name> FOR ALL TO service_role USING (true) WITH CHECK (true);

--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session_data" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
-- Allow full access for service_role (used by backend via DATABASE_URL / service_role key)
-- Deny all for anon/public (default when no policy matches)
CREATE POLICY "service_role_only" ON "sessions" FOR ALL TO service_role USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "service_role_only" ON "session_data" FOR ALL TO service_role USING (true) WITH CHECK (true);
