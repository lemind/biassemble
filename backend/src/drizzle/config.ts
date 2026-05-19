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
    const queryClient = postgres(connectionString);
    _db = drizzle(queryClient, { schema });
  }
  return _db;
}

// Convenience export for modules that call getDb() once at init
export const db = getDb;