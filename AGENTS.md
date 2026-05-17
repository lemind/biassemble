# AGENTS.md — Biassemble

## Philosophy

- Prefer KISS over DRY.
- Duplication is acceptable if abstraction harms readability.
- Avoid abstractions before the third real use case.
- Prefer boring, maintainable solutions.
- Explicit code over clever code.

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

## Git & Version Control

- Commit atomically: one logical change per commit.
- Write descriptive messages: `feat: add retry logic to syncQueue`
- Never force-push or rewrite history without explicit approval.

## Architecture

- API routes must stay thin.
- Business logic belongs in `services/`.
- Database access belongs in `repositories/`.
- Never place prompts inside route handlers.
- Avoid framework lock-in where practical.

## AI Rules

- Use structured JSON outputs only.
- Validate all AI outputs through Zod.
- Retry transient provider failures once.
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

## Workflow

- Implement incrementally.
- Verify after every meaningful change (smoke test + relevant tests).
- Do not rewrite unrelated files.
- Preserve existing architecture unless explicitly requested.

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

## Forbidden

- Premature abstractions.
- Global state unless justified.
- Silent failures.
- Hidden magic behavior.
- Microservices.
- Premature RAG/vector DB.
- Force-pushing or history rewriting.
- Committing secrets or `.env` files.