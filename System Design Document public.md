# BIASSEMBLE
## System Design Document — PUBLIC

---

# 1. Overview

## Purpose
Biassemble is an AI-assisted conversational web application that helps users identify cognitive biases within their own reasoning.

The user:
1. writes a personal situation/story
2. answers AI-generated follow-up questions
3. receives:
   - detected cognitive biases
   - contextual explanation
   - alternative perspective

The product is intentionally:
- lightweight
- reflective
- conversational
- non-clinical
- production-oriented

This project is also intended to demonstrate:
- backend architecture skills
- AI orchestration
- modern full-stack engineering
- LLM integration patterns
- durable workflows
- typed API design
- structured AI output validation

---

## Problem Statement
Most people:
- are unaware of biases influencing their decisions
- cannot map abstract cognitive bias theory onto personal situations
- receive generic self-help content instead of contextual reflection

Biassemble aims to create:

"personalized reflective feedback instead of abstract bias education"

---

## Goals

### MVP Goals
- conversational bias-detection flow
- AI-generated contextual follow-up questions
- exactly 2 detected biases per session
- production-ready architecture
- scalable backend foundation
- low infrastructure cost
- typed APIs and validated outputs

### Engineering Goals
- showcase modern backend engineering
- showcase AI orchestration patterns
- demonstrate durable workflow design
- demonstrate scalable API architecture
- demonstrate structured LLM outputs

---

## Non-Goals

### MVP Non-Goals
- therapy replacement
- psychiatric diagnosis
- long-term user memory
- multi-agent systems
- fine-tuned custom models
- vector databases
- RAG pipelines
- browser extensions
- mobile applications
- enterprise collaboration

---

# 2. Product Scope

## MVP Scope

### Reflection Flow
1. user writes story
2. AI generates follow-up questions
3. user answers questions
4. AI generates assessment
5. results page shows:
   - all cognitive biases
   - explanation
   - story-specific reasoning
   - alternative perspective
   - reflection prompt

---

## Future Scope

### Product Features
- saved history
- shareable reports
- team collaboration
- voice input
- analytics dashboard
- historical pattern analysis
- user profile personalization

### AI Features
- RAG
- embeddings
- evaluation datasets
- confidence scoring
- multi-provider orchestration
- persuasion analysis

**Repository split (engineering):** The public application repository (`biassemble`) contains frontend + session API only. Proprietary prompts, model routing, and provider credentials live in a **private AI Core** service (`biassemble-core`). The public backend calls Core over authenticated HTTP; see `specs/001-reflection-flow/architecture.md` in the app repo for the contract.
- rewrite engine

---

## User Types

| User Type | Description |
|---|---|
| Anonymous User | uses app without account |
| Registered User | saves sessions/history |
| Future Team User | collaborative analysis |

---

## Core User Flow

### Reflection Flow
Landing
→ Story Input
→ AI Questions
→ Answers
→ AI Assessment
→ Results

---

## Success Criteria

| Metric | Target |
|---|---|
| session completion | >60% |
| AI response validity | >95% |
| structured JSON parse success | >99% |
| first response latency | <5 seconds |
| infrastructure simplicity | high |

---

# 3. Functional Requirements

## Feature List

### MVP Features
- authentication
- story submission
- AI follow-up questioning
- conversational session flow
- bias assessment
- results page
- billing-ready architecture
- analytics instrumentation
- durable AI workflows

---

## Story Input

### Description
User provides free-form text describing a situation.

### Inputs
- story text

### Outputs
- session initialization

### Validation Rules
- minimum recommended length: 50 chars
- maximum length: 3000 chars

### Constraints
- profanity filtering later
- authenticated users optional in MVP

### Edge Cases
- empty submission
- extremely short submission
- spam input

### Acceptance Criteria
- user receives first AI-generated question

---

## Question Generation

### Description
AI generates contextual follow-up questions.

### Inputs
- story
- previous answers

### Outputs
- next question
- completion state

### Constraints
- questions must reference story details
- tone must stay non-judgmental
- avoid therapeutic framing

### Acceptance Criteria
- AI asks relevant contextual questions
- session progresses cleanly

---

## Bias Assessment

### Description
AI identifies exactly 2 cognitive biases.

### Outputs
- bias name
- explanation
- story connection
- alternative perspective
- reflection prompt

### Constraints
- no generic textbook output
- must reference user story
- avoid clinical claims

### Acceptance Criteria
- valid structured output
- assessment displayed on results page

---

# 4. System Architecture

## Frontend

### Stack
- Next.js 15 App Router
- React Server Components
- TypeScript strict
- Tailwind CSS 4
- shadcn/ui
- Recharts

### State Management
- React state
- server actions where useful
- session persistence via database

---

## Backend

### Stack
- Next.js API routes
- Inngest durable workflows

### Responsibilities
- orchestration
- AI workflows
- retries
- async processing
- workflow durability

---

## Database

### Stack
- Supabase PostgreSQL
- Drizzle ORM

### Purpose
- users
- sessions
- stories
- answers
- AI outputs
- billing-ready architecture
- analytics support

---

## Authentication

### Stack
- Supabase Auth
- email login
- magic links

---

## AI Providers

| Provider | Usage |
|---|---|
| Anthropic | primary reasoning |
| Gemini Flash 2.0 | cheap fast generation |
| OpenAI GPT-5 Mini | fallback/general tasks |
| DeepSeek V3.2 | experimentation |
| Perplexity Sonar Pro | research/future |

---

## External Services

| Service | Purpose |
|---|---|
| Stripe | subscriptions |
| Resend | transactional email |
| PostHog | analytics |
| Sentry | error tracking |
| Browserbase | future crawling/research |

---

## Hosting

### Platform
- Vercel

---

# 5. Integration Map

| Service | Purpose | Owner Module | Credentials | Failure Impact |
|---|---|---|---|---|
| Supabase | database/auth | backend | env | critical |
| Anthropic | AI reasoning | ai-core | env | high |
| Gemini | cheap inference | ai-core | env | medium |
| Stripe | billing | payments | env | medium |
| Resend | emails | notifications | env | low |
| PostHog | analytics | frontend | env | low |
| Sentry | error tracking | frontend/backend | env | low |
| Inngest | workflows | orchestration | env | medium |

---

# 6. Data Model

## Entities
- User
- Session
- Story
- Question
- Answer
- Assessment
- Subscription

---

## Relationships

User
→ Sessions
→ Stories
→ Answers
→ Assessments

---

## Schema Notes

### Database Philosophy
- normalized enough for scale
- JSON fields for flexible AI outputs
- billing-ready from start
- analytics-friendly

---

# 7. API Design

## Endpoints

| Endpoint | Purpose |
|---|---|
| POST /api/story | create story + questions |
| POST /api/answers | save answers + analyze |
| GET /api/result/:id | fetch assessment |
| POST /api/auth/* | auth |
| POST /api/billing/* | stripe |

---

## Authentication
- Supabase Auth
- JWT validation

---

## Error Handling
- typed JSON errors
- zod validation everywhere
- workflow retries
- graceful degradation

---

## Rate Limiting
- middleware-based
- Upstash later if needed

---

# 8. AI / LLM Layer

## AI Workflow

### Step 1
Question generation.

### Step 2
Bias analysis.

### Step 3
Structured parsing + validation.

---

## Structured Output
All providers must return:
- valid JSON
- deterministic shape
- validated via Zod

---

## Prompt Strategy
- centralized prompt registry
- provider abstraction
- reusable orchestration
- future prompt versioning

---

## Context Management
Session context includes:
- story
- previous questions
- previous answers

---

## Cost Strategy
Use cheaper models first:
- Gemini Flash
- Claude Haiku

Use premium models only when needed.

---

## Safety Rules
- no diagnosis
- no self-harm guidance
- no political manipulation
- crisis detection support message

---

## Fallback Behavior
- retry provider
- switch provider
- preserve workflow state

---

# 9. Background Jobs / Async Workflows

## Inngest Workflows

### Planned Workflows
- AI question generation
- AI assessment generation
- email sending
- analytics events
- cleanup jobs

---

## Retry Policy
- exponential backoff
- max retries configurable

---

## Idempotency
Workflow-safe execution required.

---

# 10. Billing / Entitlements

## Initial Plans

| Plan | Access |
|---|---|
| Free | limited sessions |
| Pro | future advanced AI |

---

## Stripe
- subscriptions
- customer portal
- webhook handling

---

# 11. Frontend UX

## Pages

| Route | Purpose |
|---|---|
| / | landing |
| /session | conversational flow |
| /results | assessment |
| /login | auth |
| /dashboard | future history |

---

## Components
- StoryForm
- QuestionBubble
- AnswerInput
- AssessmentCard
- LoadingState
- ErrorState

---

## Accessibility
- keyboard support
- aria labels
- mobile-first

---

# 12. Security

## Authentication
- Supabase Auth

---

## Authorization
- user-owned resources only

---

## Sensitive Data Handling
- encrypted transport
- secrets via env vars

---

## Abuse Prevention
- rate limiting
- session caps
- spam detection later

---

# 13. Non-Functional Requirements

## Performance
- first question <5s

## Reliability
- retry workflows

## Scalability
- serverless scalable architecture

## Maintainability
- modular architecture
- typed contracts

## Observability
- Sentry
- PostHog

---

# 14. Testing Strategy

## Unit Tests
- prompt builders
- parsers
- validators
- services

---

## Integration Tests
- API routes
- DB access
- workflows

---

## E2E Tests
- complete user flow

---

## AI Evaluation Tests
- golden datasets later

---

# 15. Deployment

## Environments
- local
- preview
- production

---

## CI/CD
GitHub
→ lint
→ tests
→ deploy

---

## Rollback Strategy
Vercel rollback.

---

# 16. Technical Decisions (ADR)

## Decision
Use database from MVP.

### Reason
Project demonstrates backend skills.

### Consequence
More complexity but stronger architecture.

---

## Decision
Use Inngest.

### Reason
Demonstrates durable workflow architecture.

---

## Decision
Use multiple LLM providers.

### Reason
Cost optimization + fallback resilience.

---

# 17. Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| generic AI output | high | medium | prompt iteration |
| provider downtime | medium | medium | multi-provider fallback |
| AI cost spikes | medium | low | cheap-model-first routing |
| prompt drift | medium | medium | evaluations later |

---

# 18. Open Questions

| Question | Status | Priority |
|---|---|---|
| Which provider becomes primary long-term? | open | high |
| Do we need RAG later? | open | medium |
| Should assessments expose confidence? | open | medium |
| How much history should users retain? | open | medium |