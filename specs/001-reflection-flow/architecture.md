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

## Phase mapping

| Phase | Work |
|-------|------|
| 2 ✅ | Scaffold, `lib/jobs`, Inngest transport, AI client boundary |
| 3 | DB, API routes, jobs call `getAiClient()` + persist |
| Core (private) | `/v1/reflection/question`, `/v1/reflection/assessment` |
