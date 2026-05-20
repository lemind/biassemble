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
- [x] T010 Workflow — `lib/jobs/*`, `lib/workflow/*`, thin `app/api/inngest/route.ts` (jobs consumed via Inngest)
- [x] T011 `lib/ai/parsers.ts`
- [x] T012 AI contracts — `lib/ai/contracts.ts` (DTOs only; prompts in private Core)
- [x] T013 `lib/errors.ts`
- [x] T013a `frontend/src/api/client.ts`
- [x] T010b [P] Refactor: `lib/jobs/runJob()` + thin Inngest transport (`WorkflowAdapter` for future swap)
- [x] T013b [P] `lib/constants.ts` — QUESTIONS_MIN=2, QUESTIONS_MAX=5, MAX_BLANK_ANSWERS=2, AI_MAX_RETRIES=3

**Checkpoint**: Foundation ready — Phase 3 can add DB tables, API routes, Core integration.

---

## Phase 3a: Database layer 🔵

**Goal**: Full Drizzle schema, migrations, typed queries. Blocks API routes.

- [ ] T022 [P] [US1] Full Drizzle schema — `backend/src/drizzle/schema.ts`
  - Tables: `sessions`, `stories`, `questions`, `answers`, `assessments`
  - `questions` table stores batch of 2–5 per session, indexed by position
  - `assessments.biases` — JSON column (any number), matches contracts.ts
- [ ] T023 [P] [US1] Migrations — generate + apply via `drizzle-kit`
- [ ] T024 [US1] `backend/src/lib/db/queries.ts` — typed query functions
  - `createSession()`, `getSession()`, `updateSessionStatus()`
  - `createStory()`, `createQuestions(batch[])`, `getNextQuestion()`, `createAnswer()`
  - `createAssessment()`, `getAssessment()`
  - `isLastAnswer()` — checks if all questions in batch answered
  - `getSessionAnswers()` — all Q&A for assessment generation

**Checkpoint**: DB ready — API routes can read/write.

---

## Phase 3b: Private AI Core 🔒

**Goal**: AI endpoints deployed. Can run in parallel with 3a.

- [ ] T024-core [P] Implement `POST /v1/reflection/question` — returns batch of 2–5 questions + `isComplete`
- [ ] T025-core [P] Implement `POST /v1/reflection/assessment` — returns biases (≥1, any count) + `reflectionPrompt`
- [ ] T026-core Prompt registry + Gemini (or provider) — **private repo only**
- [ ] T027-core Retry/backoff (3× exponential) + structured JSON validation in Core

**Checkpoint**: Core deployed — public backend can switch from `dev-mock` to `core`.

---

## Phase 3c: API + services + jobs 🟢

**Goal**: All public API routes wired. Depends on 3a (DB) — 3b not required if using `dev-mock`.

### Services (public backend)

- [ ] T028 [US1] `session.service.ts` — create session, call AI **synchronously** for batch of 2–5 questions via `getAiClient().generateQuestion()`, persist all, return first question
- [ ] T029 [US1] `question.service.ts` — serve next queued question from DB (no AI call); detect last answer → enqueue assessment
- [ ] T030 [US1] `assessment.service.ts` — enqueue assessment job when all questions answered

### API Routes (public backend)

- [ ] T031 [US1] `POST /api/story`
  - Validate story (Zod: 50–3000 chars)
  - Create session + story in DB
  - Call `getAiClient().generateQuestion()` **synchronously** (inline — no Inngest)
  - AI returns batch of 2–5 questions + `isComplete`
  - Persist all questions; return `{ sessionId, firstQuestion }` in <5s
  - On AI failure: return error, session status = "error"
- [ ] T031a [US1] `GET /api/session/[id]`
  - Returns session status, current question index, total questions
  - Used by frontend for polling during assessment generation
- [ ] T032 [US1] `POST /api/answers`
  - Validate answer (Zod, non-empty)
  - Persist answer
  - Return next queued question from DB (no AI call — all pre-generated)
  - If last answer: `workflow.enqueue("generate-assessment")`, return `{ assessmentPending: true }`
- [ ] T033 [US1] `GET /api/result/[id]`
  - Returns completed assessment (biases — arbitrary count — + reflectionPrompt)
  - 404 if not ready

### Jobs (wire to AI + DB)

- [ ] T041 [US1] `runGenerateQuestions` — load session + history from DB, `getAiClient().generateQuestion()`, persist question batch
- [ ] T042 [US1] `runGenerateAssessment` — load all Q&A from DB, `getAiClient().generateAssessment()`, persist assessment (any number of biases), update session status

**Checkpoint**: Backend complete — POST /api/story returns first question inline, POST /api/answers serves next from DB, GET /api/result/[id] returns assessment.

---

## Phase 4: Frontend flow 🟡

- [ ] T035 [US1] `StoryForm` — wire `submitStory()` → `POST /api/story` → receive `{ sessionId, firstQuestion }` → transition to Q&A
- [ ] T036 [US1] Q&A page — display question, text input for answer, submit → `POST /api/answers` → receive next question; repeat until `assessmentPending`
- [ ] T037 [US1] Polling hook — poll `GET /api/session/[id]` every 2s while assessment generates; show loading until ready
- [ ] T038 [US1] Assessment results page — display biases (dynamic count, not fixed 2), explanations, story connections, alternative perspectives, reflection prompt
- [ ] T039 [US1] Router/navigation — landing → Q&A → results flow
- [ ] T040 [US1] Error states — AI failure, network error, timeout; friendly messages per spec edge cases

---

## Phase 5: Testing & polish 🧪

- [ ] T014 [US1] Unit tests — services, validators, parsers
- [ ] T015 [US1] Integration tests — API routes + DB (test DB)
- [ ] T016 [US1] E2E tests — Playwright: landing → story → Q&A → results
- [ ] T017 [US1] Job unit tests — `runGenerateAssessment` with dev-mock
- [ ] T018 [US1] Retry tests — verify 3× backoff (FR-007)
- [ ] T044 Edge cases — content filter stub, blank-answer cap (MAX_BLANK_ANSWERS=2)

---

## Phase 6: US2, US3, Advanced (Future)

- [ ] T050 [US2] Expandable bias detail UI (accordion, shareability)
- [ ] T051 [US2] Session history listing
- [ ] T060 [US3] Session continuity — persist mid-flow, restore from last unanswered question
- [ ] T061 [US3] Session restore UI (enter sessionId to resume)
- [ ] T070 Production polish — analytics, performance monitoring, hardening

---

## Dependencies

```
Phase 3a (DB) ───────┐
                      ├── Phase 3c (API + jobs) ──┬── Phase 4 (Frontend)
Phase 3b (Core) ──────┘                          │
  (private, parallel)                             │
                                                  │
                                           Phase 5 (Tests)
```

1. Phase 2 ✅
2. Phase 3a (T022–T024) parallel Phase 3b (T024-core–T027-core)
3. Phase 3c starts when 3a is ready (dev-mock unblocks 3c without 3b)
4. Phase 4 depends on Phase 3c
5. Phase 5 depends on Phase 3c + Phase 4

**Note**: `AI_CLIENT_MODE=dev-mock` unblocks public-repo E2E until Core is deployed.