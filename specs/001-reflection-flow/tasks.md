# Tasks: Reflection Flow

**Input**: Design documents from `specs/001-reflection-flow/`

**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required for user stories)

**Path convention**: `frontend/src/...` = Vite SPA; `backend/src/...` = Next.js API server. Never put API keys in `frontend/` env files.

**AI Provider Note**: Gemini Flash 2.0 — free API key via Google AI Studio (60 req/min, 1500 req/day). Key lives in `backend/.env` only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup — Frontend Init → Vercel Deploy

**Purpose**: Initialize Vite + React SPA in `frontend/`, deploy live landing page.

- [x] T001 Initialize Vite + React 19 + TypeScript 6 project in `frontend/` with pnpm (`pnpm create vite . --template react-ts`)
- [x] T002 [P] Install and configure DaisyUI + Tailwind CSS v4, Zod v4, axios, ESLint + Prettier
- [x] T003 [P] Create landing page (`frontend/src/App.tsx`) with DaisyUI hero + card layout, headline, tagline
- [x] T004 [P] Set up `frontend/.env.example` with `VITE_API_URL` only (no client-side API keys)
- [x] T005 Deploy to Vercel (free tier) — live at https://frontend-topaz-eight-10.vercel.app
- [x] T006 Update root `README.md` and `frontend/README.md` with live URL, stack, how to run

**Deliverable**: https://frontend-topaz-eight-10.vercel.app — live, accessible, in READMEs.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend scaffold + core infrastructure before ANY user story API work.

- [ ] T006a Initialize Next.js 15 App Router in `backend/` — TypeScript strict, `src/app/api/` layout, `backend/.env.example`
- [ ] T007 Configure Drizzle ORM with Supabase PostgreSQL — `backend/src/drizzle/config.ts`, `backend/src/drizzle/schema.ts`
- [ ] T008 [P] Create Zod validation schemas for all entities — `backend/src/lib/validation/story.ts`, `answer.ts`, `assessment.ts`
- [ ] T009 [P] Set up Google Generative AI SDK (Gemini Flash 2.0) — `backend/src/lib/ai/gemini.ts` (server-only)
- [ ] T010 [P] Set up workflow adapter + Inngest client — `backend/src/lib/workflow/adapter.ts`, `backend/src/lib/workflow/inngest-adapter.ts`, `backend/src/inngest/client.ts`, `backend/src/app/api/inngest/route.ts` (abstracted via adapter — swap to BullMQ/RabbitMQ later with one file change)
- [ ] T011 [P] Implement structured JSON parser with Zod validation — `backend/src/lib/ai/parsers.ts`
- [ ] T012 [P] Create centralized prompt registry stubs — `backend/src/lib/ai/prompts/questions.ts`, `assessment.ts`
- [ ] T013 Create typed error handling — `backend/src/lib/errors.ts`
- [ ] T013a [P] Add axios API client in `frontend/src/api/client.ts` using `import.meta.env.VITE_API_URL`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Complete Reflection Journey (Priority: P1) 🎯 MVP

**Goal**: Users write a story, receive AI-generated follow-up questions, answer them, and receive a complete cognitive bias assessment with alternative perspectives.

**Independent Test**: Submit a story → receive questions → answer them → view complete bias assessment.

**Phase 0 sub-goal** (no DB, no AI): Deployable landing with story form + stub submit — **done**.

### Tests for User Story 1

- [ ] T014 [P] [US1] Unit test for story validation in `backend/src/lib/validation/__tests__/story.test.ts`
- [ ] T015 [P] [US1] Unit test for answer validation in `backend/src/lib/validation/__tests__/answer.test.ts`
- [ ] T016 [P] [US1] Unit test for assessment schema in `backend/src/lib/validation/__tests__/assessment.test.ts`
- [ ] T017 [P] [US1] Unit test for AI JSON parser in `backend/src/lib/ai/__tests__/parsers.test.ts`
- [ ] T018 [US1] Integration test for story → questions → answers → assessment via API

### Implementation for User Story 1 — Phase 0 Landing Page ✅

- [x] T019 [P] [US1] Build `StoryForm` with Zod validation (50–3000 chars) in `frontend/src/components/StoryForm.tsx`
- [x] T020 [US1] Wire landing: submit → `console.log` → Thank You state (no DB, no AI)
- [x] T021 [US1] Deploy Phase 0 to Vercel

### Implementation for User Story 1 — Database Layer

- [ ] T022 [P] [US1] Drizzle tables: `sessions`, `stories`, `questions`, `answers`, `assessments` — `backend/src/drizzle/schema.ts`
- [ ] T023 [P] [US1] Write initial database migration — `backend/src/drizzle/migrations/`
- [ ] T024 [US1] Typed query functions — `backend/src/lib/db/queries.ts`

### Implementation for User Story 1 — AI Layer

- [ ] T025 [P] [US1] Question generation prompt — `backend/src/lib/ai/prompts/questions.ts`
- [ ] T026 [P] [US1] Bias assessment prompt — `backend/src/lib/ai/prompts/assessment.ts`
- [ ] T027 [US1] Gemini provider + retry (3×, exponential backoff) — `backend/src/lib/ai/gemini.ts`

### Implementation for User Story 1 — Services

- [ ] T028 [US1] Session orchestration — `backend/src/services/session.service.ts`
- [ ] T029 [US1] Question generation — `backend/src/services/question.service.ts`
- [ ] T030 [US1] Bias assessment — `backend/src/services/assessment.service.ts`

### Implementation for User Story 1 — API Routes

- [ ] T031 [US1] `POST /api/story` — `backend/src/app/api/story/route.ts`
- [ ] T032 [US1] `POST /api/answers` — `backend/src/app/api/answers/route.ts`
- [ ] T033 [US1] `GET /api/result/[id]` — `backend/src/app/api/result/[id]/route.ts`

### Implementation for User Story 1 — Common Infrastructure ✅

- [x] T034a [P] [US1] `ErrorBoundary` — `frontend/src/components/common/ErrorBoundary.tsx`
- [x] T034b [P] [US1] `LoadingFallback` — `frontend/src/components/common/LoadingFallback.tsx`
- [x] T034c [US1] ErrorBoundary at App root, lazy `StoryForm` + Suspense

### Implementation for User Story 1 — Frontend UI (wire to API)

- [ ] T035 [P] [US1] `QuestionBubble` — `frontend/src/components/QuestionBubble.tsx`
- [ ] T036 [P] [US1] `AnswerInput` — `frontend/src/components/AnswerInput.tsx`
- [ ] T037 [P] [US1] `AssessmentCard` — `frontend/src/components/AssessmentCard.tsx`
- [ ] T038 [US1] Session page + client routing — `frontend/src/pages/SessionPage.tsx`, route `/session/:id`
- [ ] T039 [US1] Replace stub submit: `POST /api/story` via `frontend/src/api/client.ts`, navigate to session
- [ ] T040 [US1] Loading, error, empty states; mobile-first a11y

### Implementation for User Story 1 — Workflow Integration

- [ ] T041 [US1] Question workflow — `backend/src/inngest/functions/generate-questions.ts` (runs via `workflow.enqueue()` adapter)
- [ ] T042 [US1] Assessment workflow — `backend/src/inngest/functions/generate-assessment.ts` (runs via `workflow.enqueue()` adapter)
- [ ] T043 [US1] Retry + backoff in workflows

**Checkpoint**: User Story 1 fully functional end-to-end.

---

## Phase 4: User Story 2 - Assessment Results Viewing (Priority: P2)

**Goal**: Review completed assessment with bias detail, story connections, alternative perspective.

**Independent Test**: Complete session → verify all result sections on results page.

### Tests for User Story 2

- [ ] T044 [P] [US2] Integration test for `GET /api/result/[id]`
- [ ] T045 [P] [US2] Unit tests for `AssessmentCard` — `frontend/src/components/__tests__/`

### Implementation for User Story 2

- [ ] T046 [P] [US2] Expandable bias sections in `AssessmentCard`
- [ ] T047 [US2] Story connections per bias
- [ ] T048 [US2] Alternative perspective section
- [ ] T049 [US2] Reflection prompt at end
- [ ] T050 [US2] Results page + "Start new reflection" — `frontend/src/pages/ResultsPage.tsx`

**Checkpoint**: User Stories 1 AND 2 work independently.

---

## Phase 5: User Story 3 - Session Continuity (Priority: P3)

**Goal**: Resume interrupted sessions via session id.

**Independent Test**: Start session → note id → resume → continue from last question.

### Tests for User Story 3

- [ ] T051 [P] [US3] Integration test for `GET /api/session/[id]`
- [ ] T052 [P] [US3] Unit test for session restoration — `backend/src/services/__tests__/session.service.test.ts`

### Implementation for User Story 3

- [ ] T053 [P] [US3] Session persistence/restoration — `backend/src/services/session.service.ts`
- [ ] T054 [US3] `GET /api/session/[id]` — `backend/src/app/api/session/[id]/route.ts`
- [ ] T055 [US3] Show session id after story submit on landing
- [ ] T056 [US3] Resume flow UI — `frontend/src/components/ResumeSessionForm.tsx`

**Checkpoint**: All user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T057 [P] Content filtering before AI processing — `backend/src/lib/ai/content-filter.ts`
- [ ] T058 Blank-answer retry cap + skip
- [ ] T059 Graceful AI failure messages (frontend + backend)
- [ ] T060 [P] Structured logging for session/question/assessment ops
- [ ] T061 Security: input sanitization, rate limiting on API routes
- [ ] T062 Run full test suite
- [ ] T063 Performance: p95 first question < 7s
- [ ] T064 Documentation updates (README, plan, env examples)

---

## Dependencies & Execution Order

- **Phase 1**: Frontend setup + deploy ✅
- **Phase 2**: Backend scaffold + foundation — **BLOCKS** US1 API work
- **Phase 3–5**: User stories (depend on Phase 2)
- **Phase 6**: Polish (after stories)

### Delivery Order

1. Phase 1 + Phase 0 (T019–T021) + common infra (T034a–c) ✅
2. **Next**: Phase 2 (T006a–T013a) — backend init, Drizzle, Gemini server-side
3. Phase 3 remainder — DB, AI, API, wire frontend (T022–T043)
4. Phase 4 → US2, Phase 5 → US3, Phase 6 → polish

**Note**: P1 spec acceptance (first question < 5s) is not met until T031 + T039 are done.
