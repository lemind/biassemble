# Implementation Plan: Reflection Flow

**Branch**: `001-reflection-flow` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md) | **Architecture**: [architecture.md](architecture.md)

**Input**: Feature specification from `/specs/001-reflection-flow/spec.md`

## Summary

Build the core conversational reflection flow: users write a story, receive AI-generated follow-up questions, answer them, and get a cognitive bias assessment with alternative perspectives. Anonymous sessions, graceful AI failures, first question within 5 seconds.

**AI**: Prompts and models live in **biassemble-core** (private). Public `backend/` calls AI Core over HTTP (`AI_CLIENT_MODE=core`) or uses `dev-mock` locally.

**Queues**: Job logic in `lib/jobs/`; **Inngest** for transport today (swap-friendly via `WorkflowAdapter` + `runJob()`).

**Delivery**: Phase 0 = Vite landing (done). Phase 2 = backend foundation (done). Phase 3+ = DB, API, wire frontend.

## Technical Context

**Language/Version**: TypeScript 5.x+ (strict)

**Frontend**: Vite + React 19, DaisyUI + Tailwind v4, Zod, axios → `VITE_API_URL`

**Backend**: Next.js 15 API routes, Drizzle + Supabase, Inngest (abstracted enqueue), **AI Core HTTP client** (no prompts in public repo)

**Private AI Core**: biassemble-core — prompts, provider orchestration, API keys ([API.md](../../../biassemble-core/API.md) in workspace)

**Testing**: Vitest, Playwright, Inngest test utils

**Performance**: First question < 5s (p95 < 7s); JSON parse success > 99%

## Constitution Check

*GATE: Pass — KISS, typed outputs, validation at boundaries, secrets and prompts outside public repo.*

## Project Structure

### Documentation

```text
specs/001-reflection-flow/
├── spec.md              # product (technology-agnostic)
├── plan.md              # this file
├── tasks.md
├── architecture.md      # public vs private AI Core, queue portability
└── checklists/
```

### Source Code

```text
frontend/                    # Vite SPA
└── src/api/client.ts        # → public backend API

backend/                     # Next.js API (public)
├── src/
│   ├── app/api/             # HTTP routes + inngest webhook (transport only)
│   ├── services/            # Phase 3 — orchestration
│   ├── lib/
│   │   ├── jobs/            # runJob() — transport-agnostic handlers
│   │   ├── workflow/        # Inngest enqueue (WorkflowAdapter for future swap)
│   │   ├── ai/              # core-client | dev-mock (NO prompts)
│   │   ├── validation/      # API input schemas
│   │   └── errors.ts
│   └── drizzle/
└── .env.example

biassemble-core/             # PRIVATE repo (workspace sibling)
├── prompts/, providers/     # proprietary
└── API.md                   # contract for public backend
```

## Implementation Phases

### Phase 0: Landing page ✅

Deployed Vite app with `StoryForm` validation and stub submit.

### Phase 1: Backend foundation ✅

- Next.js 15, Drizzle stub, validation schemas, errors
- `lib/jobs/*` + `lib/workflow/*` (Inngest; jobs callable from any future worker)
- `lib/ai/*` — Core HTTP client + dev-mock (removed `gemini.ts` / `prompts/` from public)
- Frontend axios client

### Phase 2: Database layer

- Full Drizzle schema, migrations, `lib/db/queries.ts`

### Phase 3: Product API + jobs

- API routes; services enqueue jobs; jobs call `getAiClient()` + DB
- Implement AI Core endpoints in private repo (or dev-mock until ready)

### Phase 4: Frontend flow

- Wire landing → API; session/results pages

### Phase 5: Testing & polish

- Unit/integration/e2e; retries (FR-007) in Core or public client as agreed

## Complexity Tracking

Workflow and AI boundaries allow swapping the queue transport later and keeping prompts in private Core without public repo leakage.
