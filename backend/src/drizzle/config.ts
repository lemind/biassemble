import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy Drizzle DB instance — throws only on first access if DATABASE_URL is missing.
 * This avoids crashing Next.js at build/start time when env vars aren't set yet.
 */
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    // Port 6543 is Supavisor's TRANSACTION pooler. Both options are required there (ADR-004):
    // prepared statements don't survive connection reuse, and search_path must be a startup
    // parameter so unqualified tables (`sessions`) resolve without a session-level SET.
    const queryClient = postgres(connectionString, {
      prepare: false,
      connection: { search_path: "public" },
    });
    _db = drizzle(queryClient, { schema });
  }
  return _db;
}

// Convenience export for modules that call getDb() once at init
export const db = getDb;