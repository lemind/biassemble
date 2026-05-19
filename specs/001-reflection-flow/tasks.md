# Tasks: Reflection Flow

**Input**: [plan.md](plan.md), [spec.md](spec.md), [architecture.md](architecture.md)

**Path convention**: `frontend/src/...` | `backend/src/...` | prompts/models in **biassemble-core** (private)

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup — Frontend ✅

- [x] T001–T006 (Vite, deploy, READMEs)

---

## Phase 2: Foundational (Blocking) ✅

- [x] T006a Next.js 15 in `backend/`
- [x] T007 Drizzle config + stub `sessions` schema
- [x] T008 Zod validation — `backend/src/lib/validation/*`
- [x] T009 AI client boundary — `lib/ai/core-client.ts`, `dev-mock-client.ts` (no Gemini in public repo)
- [x] T010 Workflow — `lib/jobs/*`, `lib/workflow/*`, thin `app/api/inngest/route.ts`, `workers/job-consumer.ts` stub
- [x] T011 `lib/ai/parsers.ts`
- [x] T012 AI contracts — `lib/ai/contracts.ts` (DTOs only; prompts in private Core)
- [x] T013 `lib/errors.ts`
- [x] T013a `frontend/src/api/client.ts`
- [x] T010b [P] Refactor: `lib/jobs/runJob()` + thin Inngest transport (`WorkflowAdapter` for future swap)

**Checkpoint**: Foundation ready — Phase 3 can add DB tables, API routes, Core integration.

---

## Phase 3: User Story 1 — Complete Reflection Journey (P1) 🎯

### Private AI Core (biassemble-core repo)

- [ ] T024-core [P] Implement `POST /v1/reflection/question` + `POST /v1/reflection/assessment` per `biassemble-core/API.md`
- [ ] T025-core [P] Prompt registry + Gemini (or provider) — **private repo only**
- [ ] T026-core Retry/backoff + structured JSON in Core

### Database (public backend)

- [ ] T022 [P] [US1] Full Drizzle schema — `backend/src/drizzle/schema.ts`
- [ ] T023 [P] [US1] Migrations
- [ ] T024 [US1] `backend/src/lib/db/queries.ts`

### Services + API (public backend)

- [ ] T028 [US1] `session.service.ts` — create session, `workflow.enqueue("generate-questions")`
- [ ] T029 [US1] `question.service.ts`
- [ ] T030 [US1] `assessment.service.ts`
- [ ] T031 [US1] `POST /api/story`
- [ ] T032 [US1] `POST /api/answers`
- [ ] T033 [US1] `GET /api/result/[id]`

### Jobs (wire to AI + DB)

- [ ] T041 [US1] `runGenerateQuestions` — load session, `getAiClient().generateQuestion()`, persist
- [ ] T042 [US1] `runGenerateAssessment` — load Q&A, `getAiClient().generateAssessment()`, persist

### Frontend

- [ ] T035–T040 [US1] Components, session page, T039 wire `submitStory` → API

### Tests

- [ ] T014–T018 [US1] Unit + integration tests

---

## Phase 4–6: US2, US3, Polish

(Unchanged priorities — see previous tasks T044–T064; paths use `frontend/` + `backend/`)

---

## Dependencies

1. Phase 2 ✅
2. Phase 3: T022–T024 (DB) parallel T024-core (private Core)
3. T031 + T041 + T039 = first vertical slice for spec acceptance #1

**Note**: `AI_CLIENT_MODE=dev-mock` unblocks public-repo E2E until Core is deployed.
