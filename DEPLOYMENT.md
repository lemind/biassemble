# Biassemble — Production Deployment

## Architecture

```
biassemble-core (Vercel)        biassemble/backend (Vercel)      biassemble/frontend (Vercel)
  Fastify + Gemini                Next.js + Inngest                Vite + React
  GET /v1/contracts               GET /api/contracts → Core         pnpm generate:types
  POST /v1/reflection/*           POST /api/story, answers          (reads Core JSON offline)
                                   GET /api/session, result
```

## Prerequisites

- Vercel account with CLI installed (`vercel`)
- GitHub repo `lemind/biassemble-core` (private)
- GitHub repo `lemind/biassemble` (public)
- Inngest account with `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- Google AI Studio API key with Gemini access

## Deploy Core (private AI service)

```bash
cd biassemble-core

# Set environment variables on Vercel
vercel env add GEMINI_API_KEY         # Your Google AI Studio key
vercel env add GEMINI_MODEL           # gemini-2.0-flash
vercel env add AI_CORE_API_KEY        # Generate a strong random key (e.g., openssl rand -hex 32)
vercel env add PORT                   3001

# Deploy
vercel deploy --prod
```

After deploy, note the URL (e.g., `https://biassemble-core.vercel.app`).

Verify:
```bash
curl -s https://biassemble-core.vercel.app/health
# → {"status":"ok"}

curl -s https://biassemble-core.vercel.app/v1/contracts | head -c 100
# → {"reflection":{"GenerateQuestionRequest":...
```

## Deploy Backend + Frontend (public app)

```bash
cd biassemble/backend

# Set environment variables
vercel env add DATABASE_URL          # Supabase Postgres connection string
vercel env add AI_CLIENT_MODE         core
vercel env add AI_CORE_BASE_URL        https://biassemble-core.vercel.app
vercel env add AI_CORE_API_KEY         <same-key-as-core>
vercel env add INNGEST_EVENT_KEY       <from-inngest-dashboard>
vercel env add INNGEST_SIGNING_KEY     <from-inngest-dashboard>
vercel env add CORS_ORIGIN             <your-frontend-url>

# Deploy
vercel deploy --prod
```

```bash
cd ../frontend

# Deploy
vercel deploy --prod
```

## Post-Deploy Verification

### 1. Integration test (via Inngest)

```bash
cd biassemble/backend
pnpm test:integration:trigger
```

This sends a `biassemble/integration-test` event to Inngest, which runs the full flow:
1. Submits a test story → gets `sessionId`
2. Polls until questions are generated (asserts 2-5)
3. Submits matching answers
4. Polls for assessment result
5. Validates output against Zod schemas

### 2. Deploy + auto-test (one command)

```bash
cd biassemble/backend
pnpm deploy:e2e
```

### 3. Manual API check

```bash
# Submit a story
curl -X POST https://YOUR_BACKEND.vercel.app/api/story \
  -H "Content-Type: application/json" \
  -d '{"text":"I had a disagreement with my colleague about project priorities. I felt my approach was more efficient but they kept pushing for their own method. Looking back I wonder if I was too focused on my own perspective."}'

# Check contracts endpoint
curl -s https://YOUR_BACKEND.vercel.app/api/contracts | head -c 100
```

### 4. Local integration test

```bash
cd biassemble/backend
pnpm dev &                       # Start backend on port 3000
pnpm test:integration            # Run vitest integration test suite
```

## Environment Variable Reference

### Core (`biassemble-core`)

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google AI Studio key | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini model ID | `gemini-2.0-flash` |
| `AI_CORE_API_KEY` | Bearer token for Core auth | `openssl rand -hex 32` |
| `PORT` | Server port | `3001` |
| `AI_TIMEOUT_MS` | LLM timeout | `10000` |
| `AI_MAX_RETRIES` | Max retry attempts | `3` |

### Backend (`biassemble/backend`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase Postgres URL | `postgresql://...` |
| `AI_CLIENT_MODE` | `dev-mock` (local) or `core` (prod) | `core` |
| `AI_CORE_BASE_URL` | Core service URL | `https://biassemble-core.vercel.app` |
| `AI_CORE_API_KEY` | Bearer token matching Core | `<same-as-core>` |
| `INNGEST_EVENT_KEY` | Inngest event key | `...` |
| `INNGEST_SIGNING_KEY` | Inngest signing key | `signkey-prod-...` |
| `CORS_ORIGIN` | Frontend URL | `https://biassemble.vercel.app` |

## Contracts Type Generation

Run whenever Core's Zod schemas change:

```bash
cd biassemble/backend   && pnpm generate:types   # Fetches Core /v1/contracts → contracts.generated.ts
cd biassemble/frontend  && pnpm generate:types   # Reads Core JSON file → api.generated.ts