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
├── App.tsx                 # Landing page with ErrorBoundary + Suspense
├── main.tsx                # Entry point
├── index.css               # Tailwind + DaisyUI styles
└── components/
    ├── common/
    │   ├── ErrorBoundary.tsx   # Global error boundary with retry
    │   └── LoadingFallback.tsx # Suspense fallback spinner
    └── StoryForm.tsx       # Story input with Zod validation (lazy-loaded)
```

## Features (Phase 0)

- Story submission form with character validation (50–3000 chars)
- Console logging on submit
- Thank You confirmation state
- DaisyUI styled responsive layout

## What's Next

- Full conversational reflection flow (questions + answers)
- AI-powered bias assessment
- Session persistence
- Backend API (Next.js in `../backend/`)