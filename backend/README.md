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

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── route.ts              # GET /api — health check
│   │   ├── story/route.ts        # POST /api/story — submit story → session
│   │   ├── answers/route.ts      # POST /api/answers — submit answers
│   │   ├── session/[id]/route.ts # GET /api/session/:id — session state
│   │   ├── result/[id]/route.ts  # GET /api/result/:id — assessment result
│   │   ├── contracts/route.ts    # GET /api/contracts — Zod schemas
│   │   └── inngest/route.ts      # POST /api/inngest — Inngest handler
│   ├── layout.tsx
│   └── page.tsx
├── drizzle/
│   ├── schema.ts                 # Drizzle schema (sessions, assessments, questions, answers)
│   ├── config.ts                 # DB connection config
│   ├── migrations/               # SQL migration files
│   └── README.md                 # RLS conventions
├── lib/
│   ├── ai/
│   │   ├── core-client.ts        # HTTP client → biassemble-core
│   │   ├── dev-mock-client.ts    # Local mock AI client
│   │   ├── contracts.ts          # Zod schemas for AI input/output
│   │   └── parsers.ts            # Response parser helpers
│   ├── jobs/
│   │   ├── index.ts              # runJob() — queue-agnostic dispatch
│   │   ├── generate-assessment.ts # Assessment job handler
│   │   └── inngest-functions.ts  # Inngest worker registration
│   ├── workflow/
│   │   ├── adapter.ts            # WorkflowAdapter interface
│   │   ├── inngest-adapter.ts    # Inngest implementation
│   │   └── inngest-functions.ts  # Inngest-specific function defs
│   ├── validation/
│   │   ├── story.ts              # Story input validation (Zod)
│   │   ├── answer.ts             # Answer input validation (Zod)
│   │   └── assessment.ts         # Assessment response validation (Zod)
│   ├── constants.ts
│   └── errors.ts
├── services/
│   ├── session.service.ts        # Session CRUD
│   ├── question.service.ts       # Question generation orchestration
│   └── assessment.service.ts     # Assessment orchestration
└── workers/                      # Reserved for future queue variants
```

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
pnpm dev                          # http://localhost:3000
pnpm build                        # Next.js production build
pnpm db:generate                  # Detect schema changes and create migration SQL
pnpm db:push                      # Apply pending schema migrations to Supabase
pnpm test                         # Run all vitest tests
pnpm test:integration             # Run integration test suite (requires dev server running)
pnpm test:integration:trigger     # Trigger integration test via Inngest event
pnpm deploy:test                  # Deploy + auto-test (one command)
pnpm generate:types               # Fetch Core /v1/contracts → contracts.generated.ts
```
