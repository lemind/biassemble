# Biassemble

AI-assisted conversational web application that helps users identify cognitive biases in their own reasoning.

**Live**: https://frontend-topaz-eight-10.vercel.app

## Overview

Biassemble guides users through a reflective process: write a personal situation, answer AI-generated follow-up questions, and receive personalized feedback about cognitive biases that may be influencing their thinking. The app provides contextual explanations tied to the user's story and offers alternative perspectives.

The AI pipeline uses structured reasoning (story analysis → interpretations → bias hypotheses) with auditable traces, evidence binding, and quality-gated evaluation. Every bias claim references verbatim excerpts from the user's story.

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
├── frontend/               # Vite + React SPA — deployed (full reflection flow)
├── backend/                # Next.js API server + Inngest jobs — deployed
├── specs/001-reflection-flow/
│   └── architecture.md     # public backend vs private AI Core
├── docs/
│   └── specs/
│       └── phase4-contracts-e2e.md
├── DEPLOYMENT.md
├── TYPE_GENERATION.md
└── AGENTS.md
```

## Related Repositories

This app is the frontend/backend half of a 3-repo system. The AI logic lives in two sibling repos, each independently deployed:

- **[biassemble-core](../biassemble-core/README.md)** (private) — Gemini-powered reflection engine. Structured reasoning traces (story analysis → interpretations → bias hypotheses → evidence mapping), field-level parse recovery, evidence validation, CI-gated evaluation. Prompt v1.1.0 / Schema v1.0.0. Deployed. ([API.md](../biassemble-core/API.md))
- **[biassemble-engine](../biassemble-engine/README.md)** — RAG sidecar called by biassemble-core, never by this repo directly. Retrieves candidate biases for a story from a curated knowledge base and hands them to core as extra context, rather than relying on the LLM's own recall alone.
  - **RAG**: vector search (pgvector + sentence-transformers) over a bias-catalog knowledge base, unioned with a second pass from a small local LLM that catches biases the vector index misses in unfamiliar domains.
  - **Fine-tuning**: that local LLM (Gemma-3-4B) is being LoRA fine-tuned on weak-supervision pairs mined from real eval runs, to close blind spots the base model has on certain bias types — tracked as a candidate build, gated by the same CI eval suite before promotion.

Dependency direction: this repo → biassemble-core → biassemble-engine → pgvector. Never reversed.

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
| Database (Supabase + Drizzle) | Migrated — sessions, assessments, questions, answers tables (RLS-enabled) |
| Private AI Core | Prompt v1.1.0 / Schema v1.0.0 — Deployed (reasoning traces, evidence binding, field-level parse recovery, CI eval, latency logging) |

**Next**: Stage 003 planning.
## License

Proprietary — All rights reserved.