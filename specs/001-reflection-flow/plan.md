# Implementation Plan: Reflection Flow

**Branch**: `001-reflection-flow` | **Date**: 2026-05-17 (Updated 2026-05-18) | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-reflection-flow/spec.md`

## Summary

Build the core conversational reflection flow: users write a story, receive AI-generated follow-up questions, answer them, and get a cognitive bias assessment with alternative perspectives. The flow must work anonymously, handle AI request failures gracefully, and deliver responses within 5 seconds. MVP uses Gemini Flash 2.0 (free tier) as the single AI provider — no multi-provider complexity until needed later.

**Delivery strategy**: Phase 0 ships a deployable **Vite + React** landing page in `frontend/` (form + validation + stub submit). Phase 2+ adds **`backend/`** (Next.js API routes, Drizzle, Inngest, Gemini server-side only). Full reflection flow wires the SPA to the API.

## Technical Context

**Language/Version**: TypeScript 5.x+ (strict mode)

**Frontend**: Vite + React 19, DaisyUI + Tailwind CSS v4, Zod (client validation), axios → `VITE_API_URL`

**Backend**: Next.js 15 App Router (API routes only for MVP), Inngest (durable workflows), Supabase + Drizzle ORM, Zod, Google Generative AI SDK (Gemini Flash 2.0) — **API keys never exposed to the browser**

**Storage**: Supabase PostgreSQL (sessions, stories, questions, answers, assessments)

**Testing**: Vitest (unit), Playwright (e2e), Inngest test utilities (workflow)

**Target Platform**: Modern browsers; Vercel (frontend SPA + backend separately or monorepo deploy later)

**Project Type**: Split full-stack — `frontend/` SPA + `backend/` API server

**Performance Goals**: First AI question delivered within 5 seconds, p95 < 7s

**Constraints**: < 5s first response, > 99% JSON parse success, Gemini free tier limits (60 req/min, 1500 req/day)

**Scale/Scope**: Anonymous sessions first; MVP targets within Gemini free tier limits

## Constitution Check

*GATE: Pass — project follows AGENTS.md principles (KISS, typed outputs, structured JSON, validation at boundaries, incremental implementation)*

## Project Structure

### Documentation (this feature)

```text
specs/001-reflection-flow/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
frontend/                          # Vite + React SPA (deployed Phase 0)
├── src/
│   ├── App.tsx                    # Landing + routing
│   ├── main.tsx
│   ├── index.css
│   ├── api/                       # axios client → backend
│   │   └── client.ts
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── SessionPage.tsx        # /session/:id — Q&A flow
│   │   └── ResultsPage.tsx        # /session/:id/results
│   └── components/
│       ├── common/
│       │   ├── ErrorBoundary.tsx
│       │   └── LoadingFallback.tsx
│       ├── StoryForm.tsx
│       ├── QuestionBubble.tsx
│       ├── AnswerInput.tsx
│       └── AssessmentCard.tsx
└── .env.example                   # VITE_API_URL only (no secrets)

backend/                           # Next.js 15 API server (Phase 2+)
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── story/route.ts     # POST: create story, start session
│   │       ├── answers/route.ts   # POST: save answer, next question / assessment
│   │       ├── result/[id]/route.ts
│   │       └── session/[id]/route.ts
│   ├── services/
│   │   ├── session.service.ts
│   │   ├── question.service.ts
│   │   └── assessment.service.ts
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   └── queries.ts
│   │   ├── ai/
│   │   │   ├── gemini.ts
│   │   │   ├── parsers.ts
│   │   │   └── prompts/
│   │   │       ├── questions.ts
│   │   │       └── assessment.ts
│   │   ├── validation/
│   │   │   ├── story.ts
│   │   │   ├── answer.ts
│   │   │   └── assessment.ts
│   │   └── errors.ts
│   ├── inngest/
│   │   ├── client.ts
│   │   └── functions/
│   │       ├── generate-questions.ts
│   │       └── generate-assessment.ts
│   └── drizzle/
│       ├── schema.ts
│       ├── config.ts
│       └── migrations/
└── .env.example                   # GOOGLE_GENERATIVE_AI_API_KEY, DATABASE_URL, etc.

```

## Implementation Phases

### Phase 0: Deploy MVP landing page ✅

**Goal**: Live `.vercel.app` URL — story form, Zod validation, stub submit (no DB, no AI).

**Done in `frontend/`**:
- Vite + React 19 + TypeScript + DaisyUI + Tailwind v4
- `StoryForm` (50–3000 chars), `console.log` + Thank You state
- ErrorBoundary, Suspense, lazy `StoryForm`
- Deployed: https://frontend-topaz-eight-10.vercel.app

**Excludes**: Database, AI, API routes, session persistence.

---

### Phase 1: Backend scaffold + foundation

- Initialize Next.js 15 App Router in `backend/` (TypeScript strict, API routes)
- Configure Drizzle ORM + Supabase PostgreSQL
- Set up Inngest client and workflow infrastructure
- Shared Zod schemas in `backend/src/lib/validation/`
- Google Generative AI SDK in `backend/src/lib/ai/gemini.ts` (server-only)

### Phase 2: Database layer

- Drizzle schema: sessions, stories, questions, answers, assessments
- Migration + typed query functions

### Phase 3: AI layer

- Prompt registry (questions + assessment)
- Structured JSON parser + Zod validation
- Retry with exponential backoff (3 attempts)

### Phase 4: API routes

- `POST /api/story`, `POST /api/answers`, `GET /api/result/[id]`, `GET /api/session/[id]`

### Phase 5: Frontend flow (wire SPA to API)

- axios client, replace stub submit with `POST /api/story`
- Session + results pages, QuestionBubble, AnswerInput, AssessmentCard
- Loading/error/empty states; mobile-first a11y

### Phase 6: Workflow integration

- Inngest durable workflows for question + assessment generation

### Phase 7: Testing

- Unit (validators, parsers, services), integration (API + DB), e2e (full reflection journey)

## Complexity Tracking

No constitution violations — thin API routes, services layer, typed contracts, AI and secrets on server only.
