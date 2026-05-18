# Tasks: Reflection Flow

**Input**: Design documents from `specs/001-reflection-flow/`

**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**AI Provider Note**: Gemini Flash 2.0 is used as the AI provider. Google AI Studio provides a **free API key** (60 req/min, 1500 req/day) — sign up at aistudio.google.com. No payment required.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup — Frontend Init → Vercel Deploy

**Purpose**: Initialize Vite + React + TypeScript frontend in `frontend/`, configure tooling, deploy a live Vercel page. After this phase, README shows a real `.vercel.app` URL.

- [x] T001 Initialize Vite + React 19 + TypeScript 6 project in `frontend/` with pnpm (`pnpm create vite . --template react-ts`)
- [x] T002 [P] Install and configure DaisyUI + Tailwind CSS v4, Zod v4, axios, ESLint + Prettier
- [x] T003 [P] Create landing page (`src/App.tsx`) with DaisyUI hero + card layout, headline, tagline
- [x] T004 [P] Set up environment file (`.env.example`) with placeholders for `VITE_API_URL`, `VITE_GEMINI_API_KEY`
- [x] T005 Deploy to Vercel (free tier) — live at https://frontend-topaz-eight-10.vercel.app
- [x] T006 Update root `README.md` and `frontend/README.md` with live URL, stack, how to run

**Deliverable**: https://frontend-topaz-eight-10.vercel.app — live, accessible, in READMEs.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

- [ ] T007 Configure Drizzle ORM with Supabase PostgreSQL — `src/drizzle/config.ts`, `src/drizzle/schema.ts`
- [ ] T008 [P] Create Zod validation schemas for all entities — `src/lib/validation/story.ts`, `src/lib/validation/answer.ts`, `src/lib/validation/assessment.ts`
- [ ] T009 [P] Set up Google Generative AI SDK (Gemini Flash 2.0) — `src/lib/ai/gemini.ts` with typed client wrapper
- [ ] T010 [P] Set up Inngest client and workflow infrastructure — `src/inngest/client.ts`
- [ ] T011 [P] Implement structured JSON parser with Zod validation for AI outputs — `src/lib/ai/parsers.ts`
- [ ] T012 [P] Create centralized prompt registry stubs — `src/lib/ai/prompts/questions.ts`, `src/lib/ai/prompts/assessment.ts`
- [ ] T013 Create typed error handling and error classes — `src/lib/errors.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Complete Reflection Journey (Priority: P1) 🎯 MVP

**Goal**: Users write a story, receive AI-generated follow-up questions, answer them, and receive a complete cognitive bias assessment with alternative perspectives.

**Independent Test**: Submit a story → receive questions → answer them → view complete bias assessment.

**Phase 0 sub-goal** (no DB, no AI): A deployable landing page with story form + console.log + "Thank you" state, shipped to the same Vercel URL.

### Tests for User Story 1

- [ ] T014 [P] [US1] Unit test for story validation in `src/lib/validation/__tests__/story.test.ts`
- [ ] T015 [P] [US1] Unit test for answer validation in `src/lib/validation/__tests__/answer.test.ts`
- [ ] T016 [P] [US1] Unit test for assessment schema validation in `src/lib/validation/__tests__/assessment.test.ts`
- [ ] T017 [P] [US1] Unit test for AI JSON parser in `src/lib/ai/__tests__/parsers.test.ts`
- [ ] T018 [US1] Integration test for story → questions → answers → assessment flow via API

### Implementation for User Story 1 — Phase 0 Landing Page (deployable immediately)

- [x] T019 [P] [US1] Build `StoryForm` component with Zod validation (STORY_MIN_LENGTH=50, STORY_MAX_LENGTH=3000) in `src/components/StoryForm.tsx`
- [x] T020 [US1] Wire landing page: `StoryForm` → submit → `console.log({ storyText })` → show "Thank you" state (no DB, no AI)
- [x] T021 [US1] Deploy Phase 0 to Vercel — landing page goes live with interactive form

### Implementation for User Story 1 — Database Layer

- [ ] T022 [P] [US1] Create Drizzle schema tables: `sessions`, `stories`, `questions`, `answers`, `assessments` — `src/drizzle/schema.ts`
- [ ] T023 [P] [US1] Write initial database migration
- [ ] T024 [US1] Implement typed query functions for all entities — `src/lib/db/queries.ts`

### Implementation for User Story 1 — AI Layer

- [ ] T025 [P] [US1] Implement question generation prompt in `src/lib/ai/prompts/questions.ts`
- [ ] T026 [P] [US1] Implement bias assessment prompt in `src/lib/ai/prompts/assessment.ts`
- [ ] T027 [US1] Implement Gemini Flash 2.0 provider with retry logic (3 retries, exponential backoff) — `src/lib/ai/gemini.ts`

### Implementation for User Story 1 — Services

- [ ] T028 [US1] Implement session orchestration service — `src/services/session.service.ts`
- [ ] T029 [US1] Implement question generation orchestration — `src/services/question.service.ts`
- [ ] T030 [US1] Implement bias assessment orchestration — `src/services/assessment.service.ts`

### Implementation for User Story 1 — API Routes

- [ ] T031 [US1] Implement `POST /api/story` — validate story, create session, trigger question generation
- [ ] T032 [US1] Implement `POST /api/answers` — validate answer, save, check completion, trigger assessment
- [ ] T033 [US1] Implement `GET /api/result/[id]` — fetch completed assessment

### Implementation for User Story 1 — Common Infrastructure

- [x] T034a [P] [US1] Build `ErrorBoundary` component with DaisyUI error display + retry in `src/components/common/ErrorBoundary.tsx`
- [x] T034b [P] [US1] Build `LoadingFallback` component with DaisyUI spinner in `src/components/common/LoadingFallback.tsx`
- [x] T034c [US1] Wire ErrorBoundary at App root, lazy-load StoryForm with Suspense fallback

### Implementation for User Story 1 — Frontend UI (future phases)

- [ ] T035 [P] [US1] Build `QuestionBubble` component — `src/components/QuestionBubble.tsx`
- [ ] T036 [P] [US1] Build `AnswerInput` component — `src/components/AnswerInput.tsx`
- [ ] T037 [P] [US1] Build `AssessmentCard` component — `src/components/AssessmentCard.tsx`
- [ ] T038 [US1] Implement session conversation page — `src/(session)/session/[id]/page.tsx` + loading state
- [ ] T039 [US1] Add loading, error, and empty states for remaining components
- [ ] T040 [US1] Ensure mobile-first responsive design and accessibility

### Implementation for User Story 1 — Workflow Integration

- [ ] T041 [US1] Wire Inngest durable workflow for question generation — `src/inngest/functions/generate-questions.ts`
- [ ] T042 [US1] Wire Inngest durable workflow for assessment generation — `src/inngest/functions/generate-assessment.ts`
- [ ] T043 [US1] Add retry logic with exponential backoff to workflows

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Assessment Results Viewing (Priority: P2)

**Goal**: Users can review their completed assessment results with detailed bias explanations, story-specific reasoning, and alternative perspectives.

**Independent Test**: Complete a reflection session and verify all required output sections are displayed.

### Tests for User Story 2

- [ ] T044 [P] [US2] Integration test for assessment retrieval endpoint
- [ ] T045 [P] [US2] Unit test for assessment display components

### Implementation for User Story 2

- [ ] T046 [P] [US2] Enhance `AssessmentCard` with expandable bias detail sections
- [ ] T047 [US2] Add "story connections" section showing which parts triggered each bias
- [ ] T048 [US2] Add "alternative perspective" section with reframing
- [ ] T049 [US2] Add reflection prompt at end of assessment
- [ ] T050 [US2] Add "Start new reflection" CTA from results page

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Session Continuity (Priority: P3)

**Goal**: Users interrupted during reflection can resume later via session reference.

**Independent Test**: Start a session → get session ID → retrieve later → continue from last unanswered question.

### Tests for User Story 3

- [ ] T051 [P] [US3] Integration test for session resume endpoint
- [ ] T052 [P] [US3] Unit test for session state restoration logic

### Implementation for User Story 3

- [ ] T053 [P] [US3] Implement session state persistence/restoration in `src/services/session.service.ts`
- [ ] T054 [US3] Implement `GET /api/session/[id]` — restore session state
- [ ] T055 [US3] Add session ID display on landing page after story submission
- [ ] T056 [US3] Add "Resume session" flow — accept session ID, restore UI

**Checkpoint**: All user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T057 [P] Add content filtering for offensive/inappropriate content before AI processing
- [ ] T058 Implement blank-answer retry capping and "skip" functionality
- [ ] T059 Add graceful error handling for AI failures (friendly messages, no data loss)
- [ ] T060 [P] Add logging for all session, question, and assessment operations
- [ ] T061 Security hardening: input sanitization, rate limiting
- [ ] T062 Run full test suite — fix failures
- [ ] T063 Performance: ensure p95 first-question delivery < 7s
- [ ] T064 Documentation updates

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: No dependencies — start immediately → ends with live Vercel URL
- **Phase 2 (Foundational)**: Depends on Setup — BLOCKS all user stories
- **Phase 3–5 (US1/US2/US3)**: Depend on Foundational
- **Phase 6 (Polish)**: Depends on all user stories complete

### Delivery Order

1. **Phase 1** → Setup → Deploy → **live Vercel URL in README** ✅
2. **Phase 0 sub-goal** (T019–T021) → interactive landing page on same URL, no backend ✅
3. **Common infrastructure** (T034a–T034c) → ErrorBoundary + Suspense ✅
4. **Phase 2** → Foundation ready
5. **Phase 3 remaining** → Full US1 with AI + DB
6. **Phase 4** → US2
7. **Phase 5** → US3
8. **Phase 6** → Polish

**Phase 0** (T019–T021) + **Common infra** (T034a–T034c) done. What's left for Phase 3: full AI/DB flow, remaining UI components (QuestionBubble, AnswerInput, AssessmentCard), session page, and workflow integration.
