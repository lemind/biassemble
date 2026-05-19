# Biassemble — Backend (public)

Next.js 15 API server: sessions, persistence, background jobs. **Does not contain prompts or LLM API keys.**

## Architecture

```text
API routes → services → workflow.enqueue()     (fast response)
                    ↘ lib/jobs/runJob()        (Inngest worker today)
                         ↘ getAiClient()       (HTTP → biassemble-core OR dev-mock)
                         ↘ Drizzle / Supabase
```

See [specs/001-reflection-flow/architecture.md](../specs/001-reflection-flow/architecture.md).

## Swapping the queue later (not implemented now)

Only **Inngest** is wired. To move to another broker later without rewriting business logic:

1. Keep `lib/jobs/runJob()` unchanged.
2. Add a new file implementing `WorkflowAdapter` in `lib/workflow/`.
3. Change the export in `lib/workflow/adapter.ts`.
4. Register a new worker that calls `runJob(jobType, payload)` (same as `inngest-functions.ts` does today).

## Environment

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase Postgres |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Background jobs |
| `AI_CLIENT_MODE` | `dev-mock` (local) or `core` (production) |
| `AI_CORE_BASE_URL`, `AI_CORE_API_KEY` | Private AI Core when `core` |

## Commands

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm db:generate
pnpm db:push
```
