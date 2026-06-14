# Biassemble — Frontend

AI-assisted conversational web application that helps users identify cognitive biases in their own reasoning.

**Live**: https://frontend-topaz-eight-10.vercel.app

## Tech Stack

| Technology | |
|------------|---|
| **Framework** | Vite + React 19 |
| **Language** | TypeScript 6 (strict) |
| **Styling** | DaisyUI + Tailwind CSS v4 |
| **Validation** | Zod v4 |
| **HTTP** | axios |
| **Package manager** | pnpm |
| **Deploy** | Vercel |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:5173)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
src/
├── App.tsx                    # Root: LandingPage with ErrorBoundary + Suspense
├── main.tsx                   # Entry point
├── index.css                  # Tailwind + DaisyUI styles
├── api/
│   └── client.ts              # Axios instance, POST /api/story, /api/answers, GET /api/result
├── hooks/
│   ├── useReflectionFlow.ts   # Orchestrates story → questions → answers → assessment flow
│   └── usePollAssessment.ts   # Polls backend for async assessment completion
├── types/
│   ├── api.ts                 # Shared API type definitions
│   ├── api.generated.ts       # Generated from Core contracts (pnpm generate:types)
│   └── ui.ts                  # UI-specific types (step enums, status)
└── components/
    ├── LandingPage.tsx        # Story submission form with Zod validation
    ├── QAFlow.tsx             # Question-answer interactive flow
    ├── AssessmentLoading.tsx  # Loading state while assessment is computed
    ├── ResultsView.tsx        # Bias assessment results display
    ├── StoryForm.tsx          # Story input component (lazy-loaded)
    └── common/
        ├── ErrorBoundary.tsx  # Global error boundary with retry
        ├── LoadingFallback.tsx# Suspense fallback spinner
        └── BiassembleLayout.tsx # Shared layout wrapper
```

## Features

- **Story Submission** — Form with character validation (50–3000 chars), submits to backend
- **AI Question Flow** — Displays 2–5 contextual follow-up questions from AI, collects answers
- **Assessment Results** — Displays bias analysis with explanations, story connections, alternative perspectives
- **Async Polling** — Polls backend for assessment completion with loading state
- **Error Handling** — Global error boundary with retry, per-step error states

## Environment

Copy `.env.example` to `.env.local`:

```bash
VITE_API_URL=http://localhost:3000
```

Do **not** add Gemini or database keys here — those belong in `../backend/.env.local` only.

## Type Generation

Run whenever Core's Zod schemas change:

```bash
pnpm generate:types   # Reads Core JSON file → src/types/api.generated.ts