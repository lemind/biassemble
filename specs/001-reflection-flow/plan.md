# Implementation Plan: Reflection Flow

**Branch**: `001-reflection-flow` | **Date**: 2026-05-17 (Updated 2026-05-18) | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-reflection-flow/spec.md`

## Summary

Build the core conversational reflection flow: users write a story, receive AI-generated follow-up questions, answer them, and get a cognitive bias assessment with alternative perspectives. The flow must work anonymously, handle AI request failures gracefully, and deliver responses within 5 seconds. MVP uses Gemini Flash 2.0 (free tier) as the single AI provider — no multi-provider complexity until needed later.

**Delivery strategy**: Phase 0 ships a deployable landing page first (Next.js on Vercel, form with console.log) to establish a real production URL. Full AI/DB flows come in later phases.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 App Router, Inngest (durable workflows), Supabase + Drizzle ORM, Zod validation, Google Generative AI SDK (Gemini Flash 2.0)

**Storage**: Supabase PostgreSQL (sessions, stories, questions, answers, assessments)

**Testing**: Vitest (unit), Playwright (e2e), Inngest test utilities (workflow)

**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge), Vercel deployment

**Project Type**: Full-stack web application (Next.js with API routes)

**Performance Goals**: First AI question delivered within 5 seconds, p95 < 7s

**Constraints**: < 5s first response, > 99% JSON parse success, Gemini free tier limits (60 req/min, 1500 req/day)

**Scale/Scope**: Anonymous sessions first; MVP targets within Gemini free tier limits

## Constitution Check

*GATE: Pass — project follows AGENTS.md principles (KISS, typed outputs, structured JSON, validation at boundaries, incremental implementation)*

## Project Structure

### Documentation (this feature)

```text
specs/001-reflection-flow/
├── spec.md              # Feature specification
├── plan.md              # This file — implementation plan
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css               # Tailwind base
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page with story input (Phase 0)
│   ├── (session)/
│   │   └── session/[id]/
│   │       ├── page.tsx           # Conversational flow UI
│   │       └── loading.tsx
│   └── api/
│       ├── story/route.ts         # POST: create story, start session
│       ├── answers/route.ts       # POST: save answer, generate next
│       └── result/[id]/route.ts  # GET: fetch assessment
├── components/
│   ├── StoryForm.tsx              # Story input form (Phase 0 compatible)
│   ├── QuestionBubble.tsx
│   ├── AnswerInput.tsx
│   └── AssessmentCard.tsx
├── services/
│   ├── session.service.ts        # Session orchestration
│   ├── question.service.ts       # Question generation orchestration
│   └── assessment.service.ts     # Bias assessment orchestration
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema
│   │   └── queries.ts            # Typed DB queries
│   ├── ai/
│   │   ├── gemini.ts             # Gemini Flash 2.0 provider
│   │   ├── prompts/
│   │   │   ├── questions.ts      # Question generation prompts
│   │   │   └── assessment.ts     # Bias analysis prompts
│   │   └── parsers.ts            # Structured JSON parsing + Zod validation
│   ├── validation/
│   │   ├── story.ts              # Story validation schemas
│   │   ├── answer.ts             # Answer validation schemas
│   │   └── assessment.ts         # Assessment output schemas
│   └── errors.ts                  # Typed error handling
├── inngest/
│   ├── client.ts                 # Inngest client
│   └── functions/
│       ├── generate-questions.ts  # Durable question generation workflow
│       └── generate-assessment.ts # Durable assessment workflow
├── drizzle/
│   ├── schema.ts                 # DB schema definitions
│   ├── migrations/
│   └── config.ts
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## Implementation Phases

### Phase 0: 🚀 Deploy MVP Landing Page (this sprint)

**Goal**: A live `.vercel.app` URL with a single-page landing — story form, submit button, console.log. No DB, no AI, no backend.

**Tasks**:
- Initialize Next.js 15 App Router project with TypeScript strict + Tailwind
- Create root layout with minimal boilerplate (`layout.tsx`, `globals.css`)
- Build landing page (`page.tsx`): headline, tagline, story textarea, submit button
- Implement `StoryForm` component with Zod validation (non-empty, 50–3000 chars)
- On submit: validate input, `console.log({ storyText })`, show "Thank you" state
- Deploy to Vercel (free tier, auto `.vercel.app` URL)

**Excludes**: Database, AI integration, API routes, session management, any server-side persistence.

**Deliverable**: `https://biassemble.vercel.app` (or similar) — accessible, real URL.

---

### Phase 1: Foundation (core infrastructure)
- Set up Next.js 15 App Router with TypeScript strict
- Configure Drizzle ORM with Supabase PostgreSQL
- Set up Inngest client and workflow infrastructure
- Create Zod validation schemas for all entities
- Implement Google Generative AI SDK setup (Gemini Flash 2.0)

### Phase 2: Database Layer
- Create drizzle schema: sessions, stories, questions, answers, assessments tables
- Write migration
- Implement typed query functions

### Phase 3: AI Layer
- Create centralized prompt registry (question generation + bias assessment)
- Implement Gemini Flash 2.0 provider (free tier, 1500 req/day)
- Build structured JSON parser with Zod validation
- Implement retry logic with exponential backoff (3 retries)

### Phase 4: API Routes
- POST /api/story — validate, create session, trigger question generation
- POST /api/answers — validate, save answer, check completion, trigger assessment
- GET /api/result/:id — fetch completed assessment

### Phase 5: Frontend UI
- Session page with QuestionBubble + AnswerInput
- Results page with AssessmentCard
- Loading/error/empty states for all components
- Accessible, mobile-first responsive design

### Phase 6: Workflow Integration
- Wire Inngest durable workflows to AI generation
- Implement retry logic with exponential backoff
- Add error handling and graceful degradation

### Phase 7: Testing
- Unit tests for services, parsers, validators
- Integration tests for API routes and DB
- E2E test for complete reflection flow
- AI output validation tests

## Complexity Tracking

No constitution violations — architecture follows AGENTS.md principles (thin API routes, services layer, typed contracts, AI abstraction).