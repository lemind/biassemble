# Biassemble

AI-assisted conversational web application that helps users identify cognitive biases in their own reasoning.

**Live**: https://frontend-topaz-eight-10.vercel.app

## Overview

Biassemble guides users through a reflective process: write a personal situation, answer AI-generated follow-up questions, and receive personalized feedback about cognitive biases that may be influencing their thinking. The app provides contextual explanations tied to the user's story and offers alternative perspectives.

The AI pipeline uses structured reasoning (story analysis → interpretations → bias hypotheses) with auditable traces, evidence binding, and quality-gated evaluation. Every bias claim references verbatim excerpts from the user's story.

> **Reasoning infrastructure complete** — auditable traces, evidence-based assessment, two-phase evaluation, and CI quality gates. See [biassemble-core README](../biassemble-core/README.md) for details.

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

**biassemble-core/** (private, workspace sibling) — Gemini-powered reflection engine with structured reasoning traces, evidence binding per bias claim, two-phase assessment (story-only → post-questions), and quality metrics (evidence_grounded_rate, schema_parse_rate). CI-gated evaluation with golden and no_bias adversarial datasets. Stage 001 deployed, Stage 002 spec approved. ([API.md](../biassemble-core/API.md))

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
| Frontend (React + Vite) | Deployed — full reflection flow (story → questions → assessment → results) |
| Backend (Next.js API + Inngest) | Deployed — story/answers/result/session routes, async assessment jobs |
| Database (Supabase + Drizzle) | Migrated — sessions, assessments, questions, answers tables |
| Private AI Core | Stage 001 + Stage 002 deployed (reasoning traces, evidence binding, CI eval) |

**Next**: Backend unit tests (T014), E2E Playwright tests (T016).

## License

Proprietary — All rights reserved.