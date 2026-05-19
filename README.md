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
| **Backend** | Next.js 15 (in `backend/`) — API routes, Inngest workflows (abstracted for BullMQ/RabbitMQ swap) |
| **Validation** | Zod v3 (backend) / Zod v4 (frontend) |
| **Database** | Supabase PostgreSQL + Drizzle ORM |
| **AI** | Google Gemini Flash 2.0 (free via Google AI Studio) |
| **Deploy** | Vercel (frontend + backend) |
| **Package manager** | pnpm |

## Project Structure

```
biassemble/
├── frontend/               # Vite + React SPA — deployed (Phase 0)
├── backend/                # Next.js API server — scaffolded (Phase 2)
├── specs/                  # Spec-kit feature specifications
│   └── 001-reflection-flow/
└── AGENTS.md               # Engineering conventions
```

Private AI-core docs live outside this repo (`biassemble-core/` at workspace root).

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
| Phase 0 landing (`frontend/`) | Deployed — story form + validation + stub submit |
| Phase 2 backend scaffold (`backend/`) | Done — Next.js 15, Drizzle, Gemini, Inngest, Zod, typed errors |
| P1 reflection flow (spec) | Not started — requires API routes (Phase 3) + Gemini calls |

**Next**: Phase 3 — DB tables (T022–T024), AI prompts (T025–T027), API routes (T031–T033), frontend wire (T035–T040).

## License

Proprietary — All rights reserved.