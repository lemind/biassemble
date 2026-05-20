# Biassemble

AI-assisted conversational web application that helps users identify cognitive biases in their own reasoning.

**Live**: https://frontend-topaz-eight-10.vercel.app

## Overview

Biassemble guides users through a reflective process: write a personal situation, answer AI-generated follow-up questions, and receive personalized feedback about cognitive biases that may be influencing their thinking. The app provides contextual explanations tied to the user's story and offers alternative perspectives.

## Key Features

- **Conversational Flow** – Step-by-step reflection with AI-generated questions
- **Bias Detection** – Identifies cognitive biases in personal reasoning
- **Contextual Feedback** – Explanations tied directly to your story
- **Alternative Perspectives** – Offers different ways to view the situation
- **Production-Ready Architecture** – Built with modern, scalable patterns

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vite + React 19, TypeScript 6, DaisyUI + Tailwind CSS v4 |
| **Backend** | Next.js 15 — API routes, Inngest jobs via `lib/jobs/runJob()` (swap-friendly) |
| **Validation** | Zod v3 (backend) / Zod v4 (frontend) |
| **Database** | Supabase PostgreSQL + Drizzle ORM |
| **AI** | Private **biassemble-core** service (HTTP); `dev-mock` for local public-repo dev |
| **Deploy** | Vercel (frontend + backend) |
| **Package manager** | pnpm |

## Project Structure

```
biassemble/
├── frontend/               # Vite + React SPA — deployed (Phase 1)
├── backend/                # Next.js API server — scaffolded (Phase 2)
├── specs/001-reflection-flow/
│   └── architecture.md     # public backend vs private AI Core
└── AGENTS.md
```

**biassemble-core/** (private, workspace sibling) — prompts, models, `POST /v1/reflection/*` ([API.md](../biassemble-core/API.md)).

## Getting Started (Frontend)

```bash
cd frontend
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # production build
```

## Status

| Area | Status |
|------|--------|
| Phase 1 landing (`frontend/`) | Deployed — story form + validation + stub submit |
| Phase 2 backend (`backend/`) | Done — jobs, workflow adapter, AI Core HTTP client (no prompts in public repo) |
| Private AI Core | Implement `biassemble-core/API.md` |
| P1 reflection flow | Phase 3 — DB, API routes, wire jobs + frontend |

**Next**: Phase 3 — `POST /api/story`, `runGenerateQuestions`, Core or `dev-mock`.

## License

Proprietary — All rights reserved.