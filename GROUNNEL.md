# Grounnel

Paste any text and check its factual claims against the open web.

**Live**: https://grounnel.n30sk.cc
**Article**: [The model's explanation had the right answer. Its verdict didn't.](https://dev.to/lemind/the-models-explanation-had-the-right-answer-its-verdict-didnt-2ji0) — how the verdict checks work, and where they fail

## Overview

Grounnel extracts the factual claims from a text and checks each one against sources it finds on the web. No source documents are needed. Every claim comes back marked in the text with a verdict and the source sentences behind it.

It is free, with no signup. Public alpha since September 2026, built and run by one person.

The core rule: **a false accusation is worse than a missed detection.** When the system is unsure, it says `unverifiable`, not `contradicted`.

## How It Works

1. **Extract** the factual claims from the text.
2. **Exclude** claims that are not suitable for external verification: opinions, predictions, personal statements.
3. **Search** the web for sources.
4. **Verify**: the model classifies each claim against numbered source sentences. It can only cite sentences by number; the quoted text is looked up in code, so it cannot invent a quote.
5. **Gates**: 12 deterministic checks run after every model answer. They compare the verdict with the model's own explanation, require cited evidence for `contradicted` and `supported`, and compare numbers and years with the evidence.
6. **Escalate**: every claim not marked `supported` is searched again with a wider pool — 8, then 11 usable pages, up from 5 in the first pass.

Steps 4 and 5 are explained in detail in the [article](https://dev.to/lemind/the-models-explanation-had-the-right-answer-its-verdict-didnt-2ji0).

## Key Features

- **Inline verdicts** – `supported`, `partially_supported`, `contradicted`, `unsupported`, `unverifiable` or `excluded`, marked in the original text
- **Sources behind the verdicts** – `supported`, `partially_supported` and `contradicted` show the exact source sentences, with links
- **Two scores** – a finished check shows **groundedness** and **assessment completeness** (0–100)
- **Share links** – every run gets a permanent link that anyone can open
- **Public measurements** – the [Stats](https://grounnel.n30sk.cc/stats) page shows the verdict mix and what the numbers do and do not show

## Limits

- One check covers up to 40 claims, about 3,000 characters. Longer texts are checked in part, and the result says so.
- The 40-claim cap is measured, not chosen: it fits the hosting platform's 300-second function limit.
- There is no published false-accusation rate yet; `contradicted` verdicts from real use have not been audited by hand.
- Shared result pages are not indexed by search engines, because they show text that users pasted.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vite + React 19, TypeScript 6, DaisyUI + Tailwind CSS v4 — same app as Biassemble, brand chosen by hostname |
| **Backend** | Next.js 15 API routes — a thin proxy to the private core |
| **Pipeline** | Private **biassemble-core** service (Fastify + Gemini) — extraction, search, verification, gates |
| **Run state** | Upstash Redis (authoritative); Postgres via Supabase + Drizzle for analytics |
| **Jobs** | Inngest crons |
| **Deploy** | Vercel |

## Where the Code Lives

```
biassemble/
├── frontend/src/components/grounnel/   # Check UI, results, shared page
├── frontend/src/hooks/                 # useGrounnelRun, usePollGrounnelStatus
├── backend/src/app/api/grounnel/       # extract, status, assessment, stats routes
├── backend/src/services/grounnel.service.ts
├── specs/002-grounnel-frontend/
├── specs/003-grounnel-backend/
└── specs/004-grounnel-public-site/
```

The pipeline itself (prompts, gates, search) lives in the private biassemble-core repo. This repo never calls the model directly.

## Status

| Area | Status |
|------|--------|
| Check | Live (alpha) — up to 40 claims per run |
| Results | Inline verdicts, sources, two scores |
| Sharing | Permanent share links; shared pages are `noindex` |
| Pages | Check, About, Stats |

## Related

- **[Biassemble](README.md)** — the sister product in this repo: reflection on cognitive biases in your own writing.

## License

Proprietary — All rights reserved.
