# Phase 4 — Contracts Distribution & Smoke E2E

## Runtime Contract Distribution

**`GET /v1/contracts`** (Core) serves JSON descriptions of all reflection Zod schemas (field names, types, constraints). No auth required.

**`GET /api/contracts`** (Backend) proxies contracts from Core, cached in memory. Frontend can consume at runtime.

### Safety

Only data shapes are exposed — no AI prompts, model IDs, API keys, or internal architecture. Safe to share publicly.

## Smoke E2E

### Local run

```bash
cd backend
pnpm smoke:local
```

Requires local backend (port 3000) and Core running. Runs the full reflection flow directly (no Inngest).

### Prod run (via Inngest)

After deploying to Vercel:

```bash
pnpm smoke:trigger    # trigger smoke via Inngest
pnpm deploy:e2e       # deploy + auto-trigger smoke
```

The Inngest job `biassemble/smoke-e2e`:
1. Submits a test story → gets `sessionId`
2. Polls `GET /api/session/[id]` until questions are ready
3. Asserts 2-5 questions
4. Submits matching answers
5. Polls `GET /api/result/[id]` for assessment
6. Validates all output shapes against Zod schemas