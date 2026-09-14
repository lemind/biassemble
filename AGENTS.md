# AGENTS.md — Biassemble

## Philosophy

- Prefer KISS over DRY.
- Duplication is acceptable if abstraction harms readability.
- Avoid abstractions before the third real use case.
- Prefer boring, maintainable solutions.
- Explicit code over clever code.
- Measure before optimizing. Prefer profiling and instrumentation over assumptions.

## Communication

- Ask clarifying questions before acting on ambiguous requirements.
- State assumptions explicitly when information is missing.
- Propose concrete next steps, not general suggestions.

## Security & Privacy

- Never commit secrets, tokens, or `.env` contents.
- Mask credentials in logs; use parameterized queries only.
- Flag hardcoded paths, IPs, or emails before committing.

## Code Style & Consistency

- Follow project linter/formatter rules (ESLint, Prettier, etc.).
- Do not disable linters or skip formatting to "fix" a bug.
- Match existing naming conventions; do not rename variables without scope.
- **Naming**: Use descriptive names that make purpose obvious (`loadAssessment`, `pollSessionStatus`, `stopPolling`). Avoid generic names like `fetch`, `data`, `result`, `check`, `cleanup`, `doStuff`. Don't over-verbose — `updateAnswer` is good, `updateCurrentAnswerTextInState` is not.

## Git & Version Control

- Commit atomically: one logical change per commit.
- Keep commit messages short and descriptive. Example: `feat: add retry logic` — not `feat: add retry logic to syncQueue with exponential backoff and timeout`. If you need details, put them in the body.
- Never force-push or rewrite history without explicit approval.
- **Git repo location**: The `.git` directory is at `biassemble/biassemble/` (nested). Run `git` commands from `/home/dl/_prog/biassemble/biassemble/`.
- **NEVER push to `main` directly.** All work goes to feature branches (e.g. `phase-4-versioning`). Pushing to `main` is strictly forbidden without explicit human approval.

## Repository Structure & Shared Secrets

Three separate git repositories, each with its own `.git`, deploy target, and Vercel/HF project — none of this is a monorepo:

```
/home/dl/_prog/biassemble/          ← NOT a git repo (workspace container only)
├── biassemble/                     ← App repo (BE + FE) — YOU ARE HERE
│   ├── backend/                    → Vercel project "biassemble-be" (biassemble-backend.vercel.app)
│   └── frontend/                   → separate Vercel project
├── biassemble-core/                ← Core repo (private) — Gemini reasoning engine, HTTP API
│   └──                             → Vercel project "biassemble-core" (biassemble-core.vercel.app)
└── biassemble-engine/               ← RAG sidecar (Python, pure retriever, no LLM calls)
    └──                             → Hugging Face Space
```

Dependency direction: `biassemble` (this repo's backend) → `biassemble-core` → `biassemble-engine` → `pgvector`. Never reversed.

**Shared secrets that MUST match across two deploy targets at once — a mismatch fails silently as `401 Invalid API key`, not a build error:**

| Secret | Set in (this repo) | Must match | Set in (other repo) |
|---|---|---|---|
| `AI_CORE_API_KEY` | `backend`'s Vercel env (`biassemble-be`) | ⟷ | `biassemble-core`'s Vercel env (`AI_CORE_API_KEY`) |
| `AI_CORE_BASE_URL` | `backend`'s Vercel env | must point at | `biassemble-core`'s actual deployed URL |
| `GROUNNEL_INTERNAL_PROXY_SECRET` | `backend`'s Vercel env (`biassemble-be`) | ⟷ | `biassemble-core`'s Vercel env (same name) |
| — | — | (biassemble-core ⟷ biassemble-engine's `RAG_API_KEY` is a `biassemble-core`-side concern, documented there — this repo has no direct dependency on the engine) |

**Rotate `AI_CORE_API_KEY` in exactly one place and the other silently breaks** — this happened for real (2026-07-22): rotating it in `biassemble-core`'s Vercel env without updating this repo's backend broke every backend→core call with `401 Invalid API key`, no build failure, no obvious error until someone hit the app. If you ever rotate this key in either repo, update it in **both** Vercel projects in the same sitting, then verify with a real call through the backend (e.g. its `/api/contracts` proxy route) — not just a call to core directly, since that alone won't prove the backend's copy is still valid.

## Architecture

- API routes must stay thin.
- Business logic belongs in `services/`.
- Never place prompts inside route handlers.
- Avoid framework lock-in where practical.
- Prefer existing platform/framework capabilities before adding libraries.
- Database migrations must be reversible and reviewed before applying (no `:latest` in production without testing rollback).
- Do not add product-specific architecture, paths, or constraints here — those belong in `specs/<feature>/plan.md` and `architecture.md`.

## AI Rules

- Use structured JSON outputs only.
- Validate all AI outputs through Zod.
- Prefer cheaper models first.
- Keep prompts centralized and versionable.

## Error Handling & Validation

- Validate at boundaries (API, DB, external services).
- Wrap third-party calls in try/catch with structured error tags.
- Never `catch` and ignore; always log context or rethrow.
- Use TypeScript contracts internally for type safety.

## Testing

- Match test type to change: unit for logic, integration for APIs/DB, e2e for user flows.
- Run relevant tests iteratively; run full suite before finalizing.
- Mock external services; never skip tests due to flakiness without documenting why.
- Target no more than 60% test coverage — don't chase coverage numbers past that; put effort into tests that catch real bugs (core logic, gates, edge cases), not into padding coverage on straightforward/generated code.

## Spec-kit & `specs/` (keep in sync)

After **any** change that affects behavior, scope, architecture, stack, file layout, env vars, or delivery status, update the matching artifacts under `specs/` for the active feature (see `.specify/feature.json` → `feature_directory`, e.g. `specs/001-reflection-flow/`).

| Change type | Update |
|-------------|--------|
| Product scope, user flows, acceptance criteria | `spec.md` |
| Tech stack, folder structure, phases, constraints | `plan.md`, `architecture.md` |
| Task status, new work items, path corrections | `tasks.md` |
| Spec quality / readiness gates | `checklists/*.md` |

**Rules**

- Do not leave code and specs diverged: if you change the implementation, update the spec docs in the same PR/commit series (or explicitly note why deferral is safe).
- When `plan.md` structure or paths change, propagate to `tasks.md` (exact file paths, phase names, checkpoints).
- When `spec.md` requirements change, check whether `plan.md` phases and `tasks.md` still cover them; add or adjust tasks if not.
- Mark completed work in `tasks.md` (`[x]`) and reflect current status in root `README.md` when deployability or phase milestones shift.
- `spec.md` stays technology-agnostic where possible; stack and paths belong in `plan.md` / `tasks.md`, not in functional requirements.
- **Never add prompts, model IDs, or LLM API keys to the public repo** — use `biassemble-core` (private) and `lib/ai/core-client.ts` only.
- **Phase immutability**: Once a phase is marked complete (`✅`), never add new items to it. New work that's out of scope for the current phase goes into the **current/last active phase** (or a new sub-phase under it). Completed phases are frozen — do not modify them.
- **Chronological ordering in tasks.md**: Add new sub-phases to the **end** of the current phase, not in the middle. Sub-phase letters (`4a`, `4b`, `4c`, `4d`) must reflect actual completion order, not planned order. If you add work after other sub-phases were already completed, give it the next letter in sequence.

**Trigger examples** (docs update required): new `frontend/` or `backend/` package, API route added/renamed, env var moved server-side, phase completed, MVP scope narrowed or expanded.

## Workflow

- Implement incrementally.
- Verify after every meaningful change (smoke test + relevant tests).
- Do not rewrite unrelated files.
- Preserve existing architecture unless explicitly requested.
- Treat spec/plan/tasks updates as part of the change, not a follow-up chore.

## Scope Discipline

**Do only what was explicitly asked. Everything else is out of scope.**

- If the user asks to update spec files, do not touch source code.
- If the user asks to fix a bug, do not refactor surrounding code.
- If the user asks to implement Phase 1, do not start Phase 2.
- When in doubt whether an action is in scope: **don't do it, ask first.**

This applies even if the extra work seems obviously correct, helpful, or "the right thing to do." The user may have a reason for the narrow scope (reviewing incrementally, testing assumptions, coordinating with other work). Unsolicited work wastes review time and can conflict with the user's plan.

## Autonomy

### Act without asking:
- Fix typos, lint errors, or obvious bugs
- Add missing error handling or null checks
- Improve tests within the same module
- Refactor ≤1 file with zero behavior change

### Ask before acting:
- Changes affecting >3 files or >2 services
- Modifying configs, CI/CD, or deployment scripts
- Adding/removing dependencies or changing versions
- Altering public APIs, DB schemas, or auth flows
- Committing code — show summary of changes first, ask user to review before running `git commit`
- **Any work beyond the explicitly stated task — even if it seems related or necessary**

## Forbidden

- Premature abstractions.
- Global state unless justified.
- Silent failures.
- Hidden magic behavior.
- Microservices.
- Premature RAG/vector DB.
- Force-pushing or history rewriting.
- Committing secrets or `.env` files.
- Adding new dependencies (npm/pip/uv) without explicit approval and justification in PR.
