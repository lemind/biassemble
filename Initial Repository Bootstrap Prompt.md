# Biassemble — Initial Repository Bootstrap Prompt

Create a production-ready repository skeleton for Biassemble.

IMPORTANT:
This is NOT a request to fully build the application.

Goal:
Create a clean architectural foundation and implementation plan so the project can continue iteratively using Spec Kit.

The repository should be:
- modular
- typed
- production-oriented
- AI-ready
- backend-heavy
- scalable later
- easy to evolve incrementally

---

# Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 App Router + RSC + TypeScript strict + Tailwind 4 + shadcn/ui + Recharts |
| Backend | Next.js API routes + Inngest |
| Database | Supabase Postgres + Drizzle ORM |
| Auth | Supabase Auth |
| AI Providers | Anthropic + Gemini + OpenAI + DeepSeek |
| Billing | Stripe |
| Email | Resend + React Email |
| Analytics | PostHog |
| Errors | Sentry |
| Hosting | Vercel |
| Validation | Zod |

---

# Repository Goals

Create:
- initial architecture
- folder structure
- typed contracts
- API skeletons
- workflow skeletons
- DB schema draft
- provider abstraction draft
- env examples
- implementation roadmap
- ADR structure
- Spec Kit friendly documentation

DO NOT:
- fully implement UI
- build complete product
- overengineer infrastructure
- add Kubernetes/microservices
- add RAG/vector DB yet
- add fine-tuning systems

---

# Initial Folder Structure

biassemble/
├── app/
├── components/
├── features/
├── lib/
├── services/
├── inngest/
├── drizzle/
├── schemas/
├── contracts/
├── emails/
├── tests/
├── docs/
├── public/
└── scripts/

---

# Initial Architecture Requirements

## Frontend
- App Router
- server components first
- typed UI contracts
- loading/error states

## Backend
- typed API routes
- zod validation everywhere
- service layer separation
- provider abstraction
- retry-safe workflows

## Database
- drizzle schema draft
- migration setup
- typed queries

## AI
- centralized prompts
- structured outputs
- deterministic parsing
- provider wrappers

## Observability
- sentry bootstrap
- posthog bootstrap
- structured logging helpers

## Documentation
- architecture notes
- ADR template
- implementation roadmap
- Spec Kit integration notes

---

# Deliverables

Generate:
- repo structure
- architecture draft
- workflow draft
- DB schema draft
- provider abstraction draft
- README
- env.example
- setup instructions
- implementation phases

Keep implementation intentionally partial.
This repository is a foundation for iterative Spec Kit-driven development.