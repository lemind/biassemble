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
├── frontend/               # Vite + React SPA (this)
├── backend/                # Next.js API server (separate setup)
├── specs/                  # Spec-kit feature specifications
│   └── 001-reflection-flow/
├── biassemble-core/        # Private AI core docs
└── docs/                   # Project documentation
```

## Getting Started (Frontend)

```bash
cd frontend
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # production build
```

## Status

Phase 0 — MVP Landing Page (deployed). Full AI reflection flow coming next.

## License

Proprietary — All rights reserved.