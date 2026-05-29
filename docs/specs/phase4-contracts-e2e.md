# Phase 4 — Contracts Distribution & Integration Test

## Runtime Contract Distribution

**`GET /v1/contracts`** (Core) serves JSON descriptions of all reflection Zod schemas (field names, types, constraints). No auth required.

**`GET /api/contracts`** (Backend) proxies contracts from Core, cached in memory. Frontend can consume at runtime.

### Safety

Only data shapes are exposed — no AI prompts, model IDs, API keys, or internal architecture. Safe to share publicly.

## Integration Test

### Local run

```bash
cd backend
pnpm test:integration
```

Requires local backend (port 3000). Runs the full reflection flow directly (no Inngest).

### Prod run (via Inngest)

After deploying to Vercel:

```bash
pnpm test:integration:trigger    # trigger via Inngest
pnpm deploy:e2e                  # deploy + auto-trigger
```

The Inngest job `biassemble/integration-test`:
1. Submits a test story → gets `sessionId`
2. Polls `GET /api/session/[id]` until questions are ready
3. Asserts 2-5 questions
4. Submits matching answers
5. Polls `GET /api/result/[id]` for assessment
6. Validates all output shapes against Zod schemas

## Type Generation

```bash
cd backend   && pnpm generate:types  # from Core's /v1/contracts
cd frontend  && pnpm generate:types  # from Core's JSON file (offline-safe)
```
