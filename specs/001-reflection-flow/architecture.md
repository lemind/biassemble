# Architecture: Public app vs private AI Core

**Feature**: [001-reflection-flow](spec.md) | **Plan**: [plan.md](plan.md)

## Repositories

| Repo | Visibility | Contains |
|------|------------|----------|
| **biassemble** (`frontend/` + `backend/`) | Public | Product UI, sessions API, DB, **Inngest** orchestration, DTO validation |
| **biassemble-core** | Private | Prompts, model routing, provider keys, evaluation |

Flow (private SDD §7): `Public App → Public API → Private AI Core → LLM APIs`

## Public backend layers

| Layer | Path | Notes |
|-------|------|--------|
| HTTP API | `app/api/*` | Thin routes (Phase 3) |
| Services | `services/*` | Orchestration; call `workflow.enqueue` + DB |
| Jobs | `lib/jobs/runJob()` | **All async business steps** — queue-agnostic |
| Workflow | `lib/workflow/` | **Inngest only today** — thin enqueue + `inngest-functions` → `runJob` |
| AI | `lib/ai/` | HTTP to Core or `dev-mock`; no prompts here |
| DB | `drizzle/` | Sessions, stories, Q&A, assessments (Phase 3) |

## Queue portability (Inngest only for now)

```text
services → workflow.enqueue(type, payload)   [lib/workflow/inngest-adapter.ts]
                ↓
Inngest → inngest-functions.ts → runJob(type, payload)
                ↓
         generate-questions.ts / generate-assessment.ts
```

**Future swap:** implement another `WorkflowAdapter`, re-export from `adapter.ts`, add a worker that calls `runJob()`. Do **not** duplicate job logic in the transport layer.

## AI Core boundary

- Public: `lib/ai/contracts.ts` + `core-client.ts` / `dev-mock-client.ts`
- Private: prompts, models — see workspace `biassemble-core/API.md`
- Never commit prompts or `GOOGLE_*` / provider keys in the public repo

## Batch question flow (all questions at once)

```text
POST /api/story → sync AI call → AI returns 2–5 questions as array
       ↓
  persist all questions, return { sessionId, firstQuestion }
       ↓
  (frontend shows questions one at a time)
       ↓
POST /api/answers → persist → return next question from DB (no AI call)
       ↓
  ...repeat until last answer...
       ↓
POST /api/answers (last) → workflow.enqueue("generate-assessment")
       ↓
GET /api/session/[id] (poll for assessment completion)
       ↓
GET /api/result/[id] → completed assessment
```

Session states: `created` → `questioning` → `assessing` → `completed` | `error`

### Key points

- Questions are generated **synchronously** on story submit (satisfies FR-006 5s spec)
- 2–5 questions, AI decides count (`QUESTIONS_MIN`/`QUESTIONS_MAX` in constants.ts)
- `questionOutputSchema.questions` is array of 2–5 strings
- Only `generate-assessment` runs asynchronously via Inngest

## Biases: no fixed count

- `assessmentOutputSchema.biases.min(1)` — at least 1 bias, AI decides how many
- No `.length(2)` constraint; contracts, validation, and DB all use `.min(1)` only
- Frontend renders dynamic bias list

## Schema layers

| Layer | File | Source of Truth |
|-------|------|-----------------|
| AI response shape | `lib/ai/contracts.ts` | `biasItemSchema`, `questionOutputSchema` (batch array), `assessmentOutputSchema` |
| DB + API record | `lib/validation/assessment.ts` | `assessmentRecordSchema` (adds `sessionId`, imports `biasItemSchema`) |
| DB tables | `drizzle/schema.ts` | Columns match contracts |
| API input | `lib/validation/story.ts`, `answer.ts` | Zod schemas for request bodies |

Flow: Core output → validate with `contracts.ts` → map to DB record (add `sessionId`) → persist → serve via API

## Phase mapping

| Phase | Work |
|-------|------|
| 1 ✅ | Vite landing page |
| 2 ✅ | Scaffold, `lib/jobs`, Inngest transport, AI client boundary, constants |
| 3 | DB, API routes, jobs call `getAiClient()` + persist |
| Core (private) | `POST /v1/reflection/question`, `POST /v1/reflection/assessment` |

## Retry & error handling

- **FR-007**: 3 retries with exponential backoff (1s → 2s → 4s)
- Config: `lib/constants.ts` (`AI_MAX_RETRIES=3`, `AI_RETRY_BASE_DELAY_MS=1000`)
- AI failures on story submit: session status → `"error"`, user gets friendly error
- Blank answers: cap at `MAX_BLANK_ANSWERS=2`, allow skip after cap