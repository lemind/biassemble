# Drizzle — Database Migrations & Conventions

## Row-Level Security (RLS)

All tables **must** have RLS enabled with a `service_role_only` policy.

This ensures data is only accessible via the `service_role` key (used by the backend through `DATABASE_URL`), not through the public anon key.

### Adding a new table

Every new table in `schema.ts` requires a corresponding migration that:

```sql
ALTER TABLE "<table_name>" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON "<table_name>"
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Why

Supabase projects expose tables via the auto-generated REST API. Without RLS, anyone with the project URL and anon key can read/write all data. Since the backend uses a direct connection string (service_role), RLS with a `service_role`-only policy is the correct security boundary.

### Applying migrations

```bash
cd backend
pnpm drizzle-kit migrate
```
