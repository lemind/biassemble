# Phase 2 Clarification: Foundational Backend Stack

**Branch**: `001-reflection-flow` | **Date**: 2026-05-19 | **Feature spec**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md) | **Plan**: [plan.md](plan.md)

---

## Why Phase 2 Exists

Phase 1 gave us a **deployed frontend** — a Vite SPA with a story form that `console.log`s submissions. Phase 2 builds the **backend foundation** that every user story (US1, US2, US3) depends on. Without it, no API routes, no database, no AI calls can work.

**Blocking state**: `backend/` has only placeholder docs (`README.md`, `.env.example`). No Next.js init, no dependencies installed, no schema, no AI client.

---

## The Three Services: Roles & Free Tiers

### 1. Inngest — Durable Async Workflow Engine (via Adapter)

**Role**: Queues and orchestrates AI generation **after** the API responds.  
- `POST /api/story` saves the story and **immediately** enqueues a job to generate questions. The API responds in <10ms (just DB write + enqueue), and the workflow engine processes the AI call asynchronously.
- Retry logic (3×, exponential backoff) is built into the workflow engine — no manual retry code needed.

**Why Inngest for MVP, why not BullMQ/RabbitMQ now?**  
- Inngest is zero-infra — just npm + one API route. No Redis server to run, no Docker, no queue setup.
- BullMQ needs a running Redis instance (even for dev). RabbitMQ needs an Erlang runtime + broker.
- Inngest free tier (5k runs/mo) is enough for MVP. When we outgrow it, we swap the adapter.

**But we're abstracting via an adapter** (see "Workflow Abstraction" section below).  
→ All services call `workflow.enqueue()`, not Inngest directly.  
→ Swapping to BullMQ or RabbitMQ later = one new file + one line config change.

**Free Tier**:
| Limit | Value | Enough for MVP? |
|-------|-------|-----------------|
| Function runs | 5,000/month | ✅ Yes (MVP = ~3k sessions/month max) |
| Duration per run | 30 min | ✅ Yes (Gemini calls < 10s) |
| Concurrency | 10 concurrent | ✅ Yes |
| Team members | Unlimited | ✅ Yes |
| Support | Community | ⚠️ Fine for MVP |

**Cost if exceeded**: $25/mo for Pro (50k runs). Unlikely to hit during dev.

---

### 2. Drizzle ORM — Type-Safe Database Layer

**Role**: Write database schema in **TypeScript**, auto-generate SQL migrations.  
- Drizzle maps Postgres tables (`sessions`, `stories`, `questions`, `answers`, `assessments`) to typed TypeScript objects.
- Zero runtime overhead — it's just a query builder that generates raw SQL. No Prisma engine binary, no Docker needed.
- Full type inference: `db.select().from(stories).where(eq(stories.id, id))` returns typed rows.

**Why Drizzle and not Prisma?**  
- Smaller bundle (fits in serverless edge runtime).
- No binary dependencies (works with `next build` on Vercel).
- Direct SQL access when needed for complex queries.
- Single `schema.ts` file vs Prisma's separate schema file + generated client.

**Free Tier**: **MIT License — completely free, always**. It's an npm package (`drizzle-orm`, `drizzle-kit`), not a service.

**What to install**:
```json
{
  "dependencies": { "drizzle-orm": "^0.38", "postgres": "^3" },
  "devDependencies": { "drizzle-kit": "^0.30" }
}
```

---

### 3. Supabase — Hosted PostgreSQL Database

**Role**: Managed Postgres database + (future) auth provider.  
- We connect via a standard `postgres://` connection string.
- Drizzle talks to Supabase Postgres the same as any Postgres — no Supabase-specific SDK needed for MVP.
- Supabase provides: managed DB, auto-backups, point-in-time recovery, branch previews.
- Auth (Supabase Auth) is a stretch goal for registered users.

**Why Supabase and not Neon / Railway / bare RDS?**  
- Free tier is generous and includes auth for future use.
- Instant provisioning via browser — no credit card for the free plan.
- Good DX: SQL editor, table viewer, API docs auto-generated.

**Free Tier**:
| Limit | Value | Enough for MVP? |
|-------|-------|-----------------|
| Database size | 500 MB | ✅ Yes (text-only data, ~100k sessions) |
| Bandwidth | 2 GB/month | ✅ Yes |
| Auth users | 50,000 MAU | ✅ Yes (future) |
| Branching | 1 branch | ⚠️ Fine for MVP |
| PITR (backups) | 7 days | ✅ Yes |
| Egress | 2 GB | ✅ Yes |

**Cost if exceeded**: $25/mo for Pro (8 GB DB, 50 GB bandwidth). Unlikely during dev.

---

## Workflow Abstraction — Future-Proofing for BullMQ / RabbitMQ

All background job enqueuing goes through a **workflow adapter interface**, not directly to Inngest. This means:
- **Now**: InngestAdapter implements the interface
- **Later**: write BullMQAdapter (one new file), swap the import — zero changes to services, routes, or AI logic

### Adapter interface

```typescript
// backend/src/lib/workflow/adapter.ts
export type JobType = "generate-questions" | "generate-assessment"

export interface WorkflowAdapter {
  enqueue(jobType: JobType, payload: unknown): Promise<{ jobId: string }>
}
```

### How services use it

```typescript
// question.service.ts — NO Inngest imports here
import { workflow } from "@/lib/workflow/adapter"

export async function requestQuestionGeneration(sessionId: string) {
  // ... business logic (call Gemini, parse JSON, store in DB) ...
  
  // Enqueue via the abstracted adapter
  await workflow.enqueue("generate-questions", { sessionId })
}
```

### Switching to BullMQ (future)

1. `pnpm add bullmq ioredis`
2. Create `backend/src/lib/workflow/bullmq-adapter.ts`
3. Update one import line in `adapter.ts`
4. Delete `backend/src/lib/workflow/inngest-adapter.ts`
5. Remove Inngest env vars, add Redis URL

**Result**: Zero changes to API routes, services, DB queries, AI calls, or frontend.

---

## How They Fit Together (Data Flow Diagram)

```
┌──────────────┐     POST /api/story     ┌──────────────────────────────────┐
│              │ ───────────────────────→ │                                  │
│   Browser    │                          │        Next.js API Route         │
│  (Vite SPA)  │ ←──── JSON response ─── │  (backend/src/app/api/story/)    │
│              │                          │                                  │
└──────────────┘                          └──────────┬───────────────────────┘
                                                      │
                                                      │ 1. Validate with Zod
                                                      │ 2. Insert into DB via Drizzle
                                                      │ 3. workflow.enqueue() [via adapter]
                                                      │ 4. Return sessionId + status
                                                      │
                                                      ▼
                              ┌──────────────────────────────────────────┐
                              │           Supabase PostgreSQL            │
                              │  Tables: sessions, stories, questions,   │
                              │          answers, assessments            │
                              │  Accessed via: Drizzle ORM (typed SQL)   │
                              └──────────────────────────────────────────┘
                                                      ▲
                                                      │
                              ┌───────────────────────┴───────────────────────┐
                              │        Workflow Adapter (abstracted)         │
                              │  backend/src/lib/workflow/adapter.ts         │
                              │                                               │
                              │  ┌──────────────┐   ┌──────────────────┐    │
                              │  │ InngestAdapter│   │ BullMQAdapter    │    │
                              │  │ (NOW — MVP)   │   │ (FUTURE — Redis) │    │
                              │  └──────┬───────┘   └──────────────────┘    │
                              │         │                                    │
                              │         ▼                                    │
                              │  ┌──────────────────────────────────┐       │
                              │  │  Workflow functions:             │       │
                              │  │  1. generate-questions.ts        │       │
                              │  │     └→ Gemini Flash 2.0          │       │
                              │  │     └→ Zod parse → store in DB   │       │
                              │  │  2. generate-assessment.ts       │       │
                              │  │     └→ Gemini Flash 2.0          │       │
                              │  │     └→ Zod parse → store in DB   │       │
                              │  └──────────────────────────────────┘       │
                              └─────────────────────────────────────────────┘
```

**Key insight**: The API responds fast (< 10ms for DB write) and returns immediately. The workflow engine processes AI calls asynchronously. The frontend polls or uses a loading state to show "Generating questions..." while the workflow runs. Whether it's Inngest or BullMQ under the hood, the API route never changes.

---

## Phase 2 Task Map

| Task ID | What | File(s) to Create/Modify | Depends On |
|---------|------|--------------------------|------------|
| **T006a** | Init Next.js 15 App Router | `backend/` — `next.config.ts`, `tsconfig.json`, `package.json`, `src/app/layout.tsx`, `src/app/api/route.ts`, `.env.example` | — |
| **T007** | Configure Drizzle ORM + Supabase | `backend/src/drizzle/config.ts`, `backend/src/drizzle/schema.ts` (start), `backend/drizzle.config.ts` | T006a |
| **T008** | Zod validation schemas | `backend/src/lib/validation/story.ts`, `answer.ts`, `assessment.ts` | T006a |
| **T009** | Gemini SDK setup | `backend/src/lib/ai/gemini.ts` | T006a, T008 |
| **T010** | Workflow adapter + Inngest client | `backend/src/lib/workflow/adapter.ts`, `backend/src/lib/workflow/inngest-adapter.ts`, `backend/src/inngest/client.ts`, `backend/src/app/api/inngest/route.ts` | T006a |
| **T011** | JSON parser + Zod validation | `backend/src/lib/ai/parsers.ts` | T008, T009 |
| **T012** | Prompt registry stubs | `backend/src/lib/ai/prompts/questions.ts`, `assessment.ts` | T006a |
| **T013** | Typed error handling | `backend/src/lib/errors.ts` | T006a |
| **T013a** | Frontend axios client | `frontend/src/api/client.ts` | — (parallel) |

**[P]** = Can run in parallel with other [P] tasks (different files, no code dependencies).

---

## Execution Order

```
T006a (Next.js init) ──────────────────────────────────────────────────┐
   │                                                                     │
   ├── T007 (Drizzle config) ──────────────────────────────────────────┐ │
   ├── T008 (Zod schemas) ───────────────────────────────────────────┐ │ │
   ├── T009 (Gemini SDK) ──── depends on T008 (schema types)       ─┐│ │ │
   ├── T010 (Workflow adapter + Inngest) ──────────────────────────┐ ││ │ │
   ├── T011 (JSON parser) ──── depends on T008 + T009             ─┤ ││ │ │
   ├── T012 (Prompt stubs) ───────────────────────────────────────┤ ││ │ │
   ├── T013 (Error handling) ─────────────────────────────────────┤ ││ │ │
   └── T013a (Frontend axios) ── (parallel, no backend dep)       ┤ ││ │ │
                                                                  │ ││ │ │
                                                                  ▼ ▼▼ ▼ ▼
                                          Phase 3+ next (US1 DB tables, workflows, API)
```

**Actual recommended order**:
1. T006a (blocker — everything needs the project scaffold)
2. T007 + T008 + T012 + T013a (can all be done in parallel)
3. T009 + T010 + T013 (once T006a is ready)
4. T011 (once T008 + T009 are ready)

---

## Free Tier Summary

| Service | What it provides | Free limit | Cost if exceeded |
|---------|-----------------|------------|------------------|
| **Inngest** | Async workflow engine (queues + retries) | 5k runs/month | Pro: $25/mo for 50k |
| **BullMQ** (future) | Queue via Redis | Free (open source) | Redis hosting: ~$5–15/mo |
| **RabbitMQ** (future) | Message broker | Free (open source) | Self-host or CloudAMQP: ~$0–19/mo |
| **Drizzle ORM** | Type-safe SQL query builder | **Always free** (MIT open source) | $0 |
| **Supabase** | Hosted PostgreSQL + auth | 500 MB DB, 2 GB bandwidth | Pro: $25/mo for 8 GB |
| **Google Gemini** | AI inference (Flash 2.0) | 60 req/min, 1500 req/day | Pay-as-you-go after free |
| **Vercel** | Frontend + backend hosting | Hobby: 100 GB bandwidth, 6k build mins | Pro: $20/mo |

**Total monthly cost for MVP dev**: **$0** — every service has a generous enough free tier.

---

## After Phase 2 — What Changes

Before Phase 2: `POST /api/story` doesn't exist → frontend does `console.log`.

After Phase 2:
- `backend/` is a runnable Next.js 15 project
- Drizzle schema exists (even if empty tables aren't populated yet)
- Zod schemas validate all inputs at the boundary
- Gemini can be called from server code
- Workflow adapter is ready (Inngest wired up, BullMQ/RabbitMQ swap possible with one file change)
- Errors have typed shapes with error codes
- Frontend has an axios client pointed at `VITE_API_URL`
- Prompt registry has function stubs (empty implementations ready for Phase 3)

Phase 3 then: defines actual DB tables, writes prompts, wires API routes → calls workflow.enqueue() → gets AI results.
