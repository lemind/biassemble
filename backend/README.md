# Biassemble — Backend

Next.js 15 API server for the reflection flow: sessions, AI orchestration (Gemini), and persistence (Supabase + Drizzle).

**Status**: Not initialized yet — scaffold in Phase 2 (`tasks.md` T006a–T013).

## Responsibilities

- `POST /api/story` — validate story, create session, return first question
- `POST /api/answers` — save answer, next question or trigger assessment
- `GET /api/result/[id]` — completed assessment
- `GET /api/session/[id]` — resume session (P3)

All Gemini calls and database credentials stay here. The `frontend/` SPA only calls this API via `VITE_API_URL`.

## Planned stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router (API routes) |
| ORM | Drizzle + Supabase PostgreSQL |
| Workflows | Inngest |
| AI | Google Generative AI SDK (Gemini Flash 2.0) |
| Validation | Zod |

## Environment

See [.env.example](.env.example). Never prefix secrets with `VITE_`.

## Getting started (after scaffold)

```bash
cd backend
pnpm install
cp .env.example .env.local
# fill DATABASE_URL, GOOGLE_GENERATIVE_AI_API_KEY, Inngest keys
pnpm dev   # default http://localhost:3000
```
