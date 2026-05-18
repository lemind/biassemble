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
| **Backend** | Next.js 15 (in `backend/`) — API routes, Inngest workflows |
| **Validation** | Zod v4 |
| **Database** | Supabase PostgreSQL + Drizzle ORM |
| **AI** | Google Gemini Flash 2.0 (free via Google AI Studio) |
| **Deploy** | Vercel (frontend + backend) |
| **Package manager** | pnpm |

## Project Structure

```
biassemble/
├── frontend/               # Vite + React SPA — deployed (Phase 0)
├── backend/                # Next.js API server — scaffold docs only; init in Phase 2
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
| Backend (`backend/`) | Not initialized — see `backend/README.md` and `tasks.md` Phase 2 |
| P1 reflection flow (spec) | Not started — requires API + Gemini (server-side) |

**Next (spec-kit)**: Phase 2 tasks T006a–T013a — scaffold `backend/`, then wire `POST /api/story`.

## License

Proprietary — All rights reserved.