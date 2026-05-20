# Implementation Plan: Reflection Flow

**Branch**: `001-reflection-flow` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md) | **Architecture**: [architecture.md](architecture.md)

**Input**: Feature specification from `/specs/001-reflection-flow/spec.md`

## Summary

Build the core conversational reflection flow: users write a story, receive ALL AI-generated follow-up questions at once (batch of 2–5), answer them, and get a cognitive bias assessment with alternative perspectives. Anonymous sessions, graceful AI failures, first question within 5 seconds.

**AI**: Prompts and models live in **biassemble-core** (private). Public `backend/` calls AI Core over HTTP (`AI_CLIENT_MODE=core`) or uses `dev-mock` locally.

**Queues**: Job logic in `lib/jobs/`; **Inngest** for transport today (swap-friendly via `WorkflowAdapter` + `runJob()`).

**Delivery**: Phase 1 = Vite landing (done). Phase 2 = backend foundation (done). Phase 3 = DB + API + jobs (done). Phase 4 = Frontend. Phase 5 = Core + tests. Phase 6 = Polish.

## Technical Context

**Language/Version**: TypeScript 5.x+ (strict)

**Frontend**: Vite + React 19, DaisyUI + Tailwind v4, Zod, axios → `VITE_API_URL`

**Backend**: Next.js 15 API routes, Drizzle + Supabase, Inngest (abstracted enqueue), **AI Core HTTP client** (no prompts in public repo)

**Private AI Core**: biassemble-core — prompts, provider orchestration, API keys ([API.md](../../../biassemble-core/API.md) in workspace)

**Testing**: Vitest, Playwright, Inngest test utils

**Performance**: First question < 5s (p95 < 7s) — AI generates all 2–5 questions synchronously on story submit. JSON parse success > 99%.

## Design Decisions

### Questions: batch generation, all returned at once

- `POST /api/story` calls `getAiClient().generateQuestion()` **synchronously** (inline, not via Inngest)
- AI returns 2–5 questions as an array + `isComplete` flag
- All questions are persisted in `session_data.questions` AND returned in the API response
- Frontend receives all questions immediately — no sequential fetching
- `POST /api/answers` tracks progress only, returns `{ done, total }`
- After last answer: `workflow.enqueue("generate-assessment")`
- Bounds in `lib/constants.ts`: `QUESTIONS_MIN=2`, `QUESTIONS_MAX=5`

### Biases: AI decides count (no fixed limit)

- `assessmentOutputSchema.biases.min(1)` — at least 1, no upper bound
- `lib/validation/assessment.ts` imports `biasItemSchema` from contracts (single source of truth)
- Frontend renders dynamic bias list

### Schema source of truth

| Layer | File | Role |
|-------|------|------|
| AI Core contract | `lib/ai/contracts.ts` | Output shapes (biasItemSchema, questionOutputSchema, assessmentOutputSchema) |
| DB/API validation | `lib/validation/assessment.ts` | Extends contracts with sessionId; imports biasItemSchema |
| DB tables | `drizzle/schema.ts` | `sessions` + `session_data` (jsonb for questions/answers/biases) |

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
│   │   ├── constants.ts     # QUESTIONS_MIN/MAX, retry config
│   │   └── errors.ts
│   └── drizzle/
└── .env.example

biassemble-core/             # PRIVATE repo (workspace sibling)
├── prompts/, providers/     # proprietary
└── API.md                   # contract for public backend
```

## Implementation Phases

### Phase 1: Landing page ✅

Deployed Vite app with `StoryForm` validation and stub submit.

### Phase 2: Backend foundation ✅

- Next.js 15, Drizzle stub, validation schemas, errors
- `lib/jobs/*` + `lib/workflow/*` (Inngest; jobs callable from any future worker)
- `lib/ai/*` — Core HTTP client + dev-mock (no prompts in public repo)
- Frontend axios client
- `lib/constants.ts` (QUESTIONS_MIN=2, QUESTIONS_MAX=5, retry config)

### Phase 3: Product API + jobs ✅

- Full Drizzle schema (2 tables: `sessions` + `session_data`), migrations, `lib/db/queries.ts`
- Services: `session.service.ts`, `question.service.ts`, `assessment.service.ts`
- API routes: `POST /api/story`, `POST /api/answers`, `GET /api/session/[id]`, `GET /api/result/[id]`
- Jobs: `runGenerateQuestions`, `runGenerateAssessment` wired to services
- `AI_CLIENT_MODE=dev-mock` used throughout

### Phase 4: Frontend flow

- Wire landing → API: receives all questions, renders them
- Q&A page: submit answer → track progress; after last → poll until assessment ready
- Results page: dynamic bias list (any count)
- Session/results pages
- Error states

### Phase 5: Private AI Core + Essential tests

- Implement `POST /v1/reflection/question` + `POST /v1/reflection/assessment` in biassemble-core
- Unit tests (services, validators)
- E2E test: landing → story → Q&A → results

### Phase 6 (future): Polish + deferred tests + US2, US3

## Phase mapping (plan.md ↔ tasks.md)

| Phase | plan.md | tasks.md |
|-------|---------|----------|
| Phase 1 ✅ | Landing page | Setup — Frontend ✅ |
| Phase 2 ✅ | Backend foundation | Foundational (Blocking) ✅ |
| Phase 3 ✅ | Product API + jobs | Product API + jobs ✅ |
| Phase 4 | Frontend flow | Frontend flow |
| Phase 5 | Core + tests | Private AI Core + Essential tests |
| Phase 6 | Polish | Polish + Deferred tests + US2 + US3 |

## Complexity Tracking

Workflow and AI boundaries allow swapping the queue transport later and keeping prompts in private Core without public repo leakage.