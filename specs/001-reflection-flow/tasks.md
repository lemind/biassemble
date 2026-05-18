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

## Phase 1: Setup — Project Init → Vercel Deploy

**Purpose**: Initialize Next.js, configure tooling, and deploy a live Vercel page. After this phase, README shows a real `.vercel.app` URL.

- [ ] T001 Initialize Next.js 15 App Router project with TypeScript strict + Tailwind CSS inside `biassemble/` directory (`npx create-next-app@latest`)
- [ ] T002 [P] Configure ESLint + Prettier with project-standard settings
- [ ] T003 [P] Create root layout (`src/app/layout.tsx`), global styles (`src/app/globals.css`), and a minimal landing page (`src/app/page.tsx`) with headline + tagline
- [ ] T004 [P] Set up environment file structure (`.env.local.example`) with placeholders for: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] T005 Deploy to Vercel (free tier, auto `.vercel.app` URL) — verify live page accessible
- [ ] T006 Update `README.md` with live Vercel URL after deployment

**Deliverable**: `https://biassemble.vercel.app` — live, accessible, and listed in README.

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

- [ ] T019 [P] [US1] Build `StoryForm` component with Zod validation (50–3000 chars) in `src/components/StoryForm.tsx`
- [ ] T020 [US1] Wire landing page: `StoryForm` → submit → `console.log({ storyText })` → show "Thank you" state (no DB, no AI)
- [ ] T021 [US1] Deploy Phase 0 to Vercel — landing page goes live with interactive form

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

### Implementation for User Story 1 — Frontend UI

- [ ] T034 [P] [US1] Build `QuestionBubble` component — `src/components/QuestionBubble.tsx`
- [ ] T035 [P] [US1] Build `AnswerInput` component — `src/components/AnswerInput.tsx`
- [ ] T036 [P] [US1] Build `AssessmentCard` component — `src/components/AssessmentCard.tsx`
- [ ] T037 [US1] Implement session conversation page — `src/app/(session)/session/[id]/page.tsx` + `loading.tsx`
- [ ] T038 [US1] Add loading, error, and empty states for all components
- [ ] T039 [US1] Ensure mobile-first responsive design and accessibility

### Implementation for User Story 1 — Workflow Integration

- [ ] T040 [US1] Wire Inngest durable workflow for question generation — `src/inngest/functions/generate-questions.ts`
- [ ] T041 [US1] Wire Inngest durable workflow for assessment generation — `src/inngest/functions/generate-assessment.ts`
- [ ] T042 [US1] Add retry logic with exponential backoff to workflows

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Assessment Results Viewing (Priority: P2)

**Goal**: Users can review their completed assessment results with detailed bias explanations, story-specific reasoning, and alternative perspectives.

**Independent Test**: Complete a reflection session and verify all required output sections are displayed.

### Tests for User Story 2

- [ ] T043 [P] [US2] Integration test for assessment retrieval endpoint
- [ ] T044 [P] [US2] Unit test for assessment display components

### Implementation for User Story 2

- [ ] T045 [P] [US2] Enhance `AssessmentCard` with expandable bias detail sections
- [ ] T046 [US2] Add "story connections" section showing which parts triggered each bias
- [ ] T047 [US2] Add "alternative perspective" section with reframing
- [ ] T048 [US2] Add reflection prompt at end of assessment
- [ ] T049 [US2] Add "Start new reflection" CTA from results page

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Session Continuity (Priority: P3)

**Goal**: Users interrupted during reflection can resume later via session reference.

**Independent Test**: Start a session → get session ID → retrieve later → continue from last unanswered question.

### Tests for User Story 3

- [ ] T050 [P] [US3] Integration test for session resume endpoint
- [ ] T051 [P] [US3] Unit test for session state restoration logic

### Implementation for User Story 3

- [ ] T052 [P] [US3] Implement session state persistence/restoration in `src/services/session.service.ts`
- [ ] T053 [US3] Implement `GET /api/session/[id]` — restore session state
- [ ] T054 [US3] Add session ID display on landing page after story submission
- [ ] T055 [US3] Add "Resume session" flow — accept session ID, restore UI

**Checkpoint**: All user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T056 [P] Add content filtering for offensive/inappropriate content before AI processing
- [ ] T057 Implement blank-answer retry capping and "skip" functionality
- [ ] T058 Add graceful error handling for AI failures (friendly messages, no data loss)
- [ ] T059 [P] Add logging for all session, question, and assessment operations
- [ ] T060 Security hardening: input sanitization, rate limiting
- [ ] T061 Run full test suite — fix failures
- [ ] T062 Performance: ensure p95 first-question delivery < 7s
- [ ] T063 Documentation updates

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: No dependencies — start immediately → ends with live Vercel URL
- **Phase 2 (Foundational)**: Depends on Setup — BLOCKS all user stories
- **Phase 3–5 (US1/US2/US3)**: Depend on Foundational
- **Phase 6 (Polish)**: Depends on all user stories complete

### Delivery Order

1. **Phase 1** → Setup → Deploy → **live Vercel URL in README** ✓
2. **Phase 0 sub-goal** (T019–T021) → interactive landing page on same URL, no backend
3. **Phase 2** → Foundation ready
4. **Phase 3 remaining** → Full US1 with AI + DB
5. **Phase 4** → US2
6. **Phase 5** → US3
7. **Phase 6** → Polish

**Phase 0** (T019–T021) can be done immediately after Phase 1 since it's purely frontend with no backend deps. This gives you an interactive deployable page while foundation work continues.