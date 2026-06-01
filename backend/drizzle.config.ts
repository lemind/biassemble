import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";

// Load .env.local manually — drizzle-kit does not auto-load it
const envLocal = readFileSync(".env.local", "utf-8");
for (const line of envLocal.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && !key.startsWith("#")) {
    const value = rest.join("=").replace(/^"|"$/g, "");
    if (value) process.env[key.trim()] ??= value;
  }
}

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./src/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});