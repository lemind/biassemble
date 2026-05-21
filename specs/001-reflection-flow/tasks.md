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

**Checkpoint**: Foundation ready.

---

## Phase 3: Product API + jobs (P1) 🎯 ✅

### Database (public backend)

- [x] T022 [P] [US1] Full Drizzle schema — `backend/src/drizzle/schema.ts`
  - Tables: `sessions`, `session_data`
  - `session_data` stores story, questions (jsonb array), answers (jsonb array), biases (jsonb), reflectionPrompt
- [x] T023 [P] [US1] Migrations — generated via `drizzle-kit generate`
- [x] T024 [US1] `backend/src/lib/db/queries.ts` — typed query functions
  - `createSession()`, `getSession()`, `updateSessionStatus()`
  - `createSessionData()`, `getSessionData()`, `submitAnswer()`, `saveAssessment()`

### Services + API (public backend)

- [x] T028 [US1] `session.service.ts` — create session, call AI **synchronously** for batch of 2–5 questions via `getAiClient().generateQuestion()`, persist all, return first question
- [x] T029 [US1] `question.service.ts` — serve next queued question from DB (no AI call); detect last answer → enqueue assessment
- [x] T030 [US1] `assessment.service.ts` — enqueue assessment job when all questions answered
- [x] T031 [US1] `POST /api/story`
- [x] T031a [US1] `GET /api/session/[id]`
- [x] T032 [US1] `POST /api/answers`
- [x] T033 [US1] `GET /api/result/[id]`

### Jobs (wire to AI + DB)

- [x] T041 [US1] `runGenerateQuestions` — load session + history from DB, `getAiClient().generateQuestion()`, persist question batch
- [x] T042 [US1] `runGenerateAssessment` — load all Q&A from DB, `getAiClient().generateAssessment()`, persist assessment, update session status

**Checkpoint**: Backend complete — Phase 3 100% done. Dev-mock unblocks remaining phases.

---

## Phase 4: Frontend flow ✅

- [x] T035 [US1] `StoryForm` — wire `submitStory()` → `POST /api/story` → receive `{ sessionId, questions[] }` → transition to Q&A
- [x] T036 [US1] Q&A page — display ALL questions at once, each with text input; submit answers sequentially via `POST /api/answers` until `assessmentPending`
- [x] T037 [US1] Polling hook — poll `GET /api/session/[id]` every 2s while assessment generates; timeout after 30s
- [x] T038 [US1] Assessment results page — dynamic bias list (any count), explanations, story connections, alternative perspectives, reflection prompt
- [x] T039 [US1] Router/navigation — state machine in `App.tsx`: landing → qa → assessing → results
- [x] T040 [US1] Error states — inline errors in StoryForm, QAFlow, polling timeout with retry; `ErrorBoundary` for render crashes
- [x] T040a [US1] React Compiler (babel-plugin-react-compiler) configured via `@vitejs/plugin-react` `reactCompilerPreset` — eliminates need for manual `useMemo`/`useCallback`/`memo`
- [x] T040b [US1] `frontend/src/types/api.ts` — typed API response interfaces mirroring `backend/src/lib/ai/contracts.ts`

---

## Phase 5: Private AI Core + Essential tests

### Private AI Core (biassemble-core repo) — deferred from Phase 3

- [ ] T024-core [P] Implement `POST /v1/reflection/question` + `POST /v1/reflection/assessment` per `biassemble-core/API.md`
- [ ] T025-core [P] Prompt registry + Gemini (or provider) — **private repo only**
- [ ] T026-core Retry/backoff (3× exponential) + structured JSON in Core

### Essential tests

- [ ] T014 [US1] Unit tests — services, validators, parsers
- [ ] T016 [US1] E2E tests — Playwright: landing → story → Q&A → results

---

## Phase 6: Polish + Deferred tests + US2 + US3 (Future)

- [ ] T015 [US1] Integration tests — API routes + DB (test DB)
- [ ] T017 [US1] Job unit tests — `runGenerateAssessment` with dev-mock
- [ ] T018 [US1] Retry tests — verify 3× backoff (FR-007)
- [ ] T044 Edge cases — content filter stub, blank-answer cap (MAX_BLANK_ANSWERS=2)
- [ ] T050 [US2] Expandable bias detail UI (accordion, shareability)
- [ ] T051 [US2] Session history listing
- [ ] T060 [US3] Session continuity — persist mid-flow, restore from last unanswered question
- [ ] T061 [US3] Session restore UI (enter sessionId to resume)
- [ ] T070 Production polish — analytics, performance monitoring, hardening

---

## Dependencies

1. Phase 2 ✅
2. Phase 3 ✅ — DB + API + jobs complete
3. Phase 4 depends on Phase 3 API routes
4. Phase 5 (Private AI Core) can run in parallel with Phase 4
5. Phase 5 (tests) depends on Phase 3 + Phase 4
6. Phase 6 — deferred polish

**Note**: `AI_CLIENT_MODE=dev-mock` unblocks public-repo E2E until Core is deployed.