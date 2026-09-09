# Implementation Plan: Grounnel — Public Site (MVP)

**Branch**: `phase-5_grn-mvp` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-grounnel-public-site/spec.md`

## Summary

Make Grounnel the main product on its own domain with its own brand, add About and Stats, keep the
Biassemble URL untouched as a separate related project, and change nothing in the checking pipeline.

One frontend deployment serves both domains. Branding resolves from the hostname; the page resolves
from the path; the two stay independent. Two live UI defects are fixed on the way out because both
contradict what the About page will claim.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), matching `frontend/tsconfig`.

**Primary Dependencies**: Vite + React 19 (React Compiler), DaisyUI + Tailwind v4, axios, Zod.
**No new dependencies** — including no router (see Constraints).

**Storage**: None for this feature. Stats values derive from existing telemetry in
`biassemble-core`'s Postgres; no new tables, no new writes.

**Testing**: `frontend/` has no test runner and this feature adds none — the established pattern
(spec 002 plan.md) is plain `assert`-based checks executed through `tsx`, already a devDependency.
`brand.ts` and the path table are pure and are the only things worth checking that way. `backend/`
keeps vitest for anything added there.

**Target Platform**: Vercel. Two Vercel projects today — `frontend` and `backend` — plus
`biassemble-core` as a third. This feature adds a domain to the existing frontend project. It does
not add a project, a backend, or an Inngest registration.

**Project Type**: Web application (frontend + backend, already split).

**Performance Goals**: No change. The check pipeline is untouched; About and Stats are static or
near-static pages.

**Constraints**:

- `VITE_API_URL` is baked at build time, so one build must serve both domains — the API base cannot
  differ per host.
- Frontend and backend are **separate Vercel projects and already cross-origin**. A second domain on
  the frontend project changes nothing about that: no CORS work, no new backend, no second Inngest
  app registration. The reason to prefer one deployment is one build and one set of environment
  variables, not same-origin.
- `frontend/vercel.json` already rewrites `/(.*)` → `/index.html`, which is what makes `/grounnel`
  resolve on direct navigation today (commit `a275c2e`). FR-004 depends on that rewrite continuing
  to apply.
- The site is public; every existing backend route is authenticated. Anything the Stats page reads
  must come from a path that does not require a key.

**Scale/Scope**: 3 paths, 2 domains, 2 brands. Roughly 70 production runs and 935 claims exist as
the basis for published statistics.

## Constitution Check

*GATE: must pass before implementation.*

`.specify/memory/constitution.md` is an **unfilled template** — every principle is still a
`[PLACEHOLDER]` and it has never been ratified. There are therefore no constitutional gates to
evaluate, and this section cannot pass or fail meaningfully.

The rules that actually govern this repository live in `AGENTS.md` and the core repo's `CLAUDE.md`.
The ones that bear on this feature:

| Rule | Source | Bearing here |
|---|---|---|
| One-line commit messages, `feat\|fix\|chore\|docs(T0XX):` | CLAUDE.md | Applies to every task |
| No AI attribution in history | project convention | Applies |
| Comments ≤ ~200 chars; rationale goes in the spec | CLAUDE.md | `brand.ts` and the T014/T015 fixes |
| Don't add tests to raise coverage; add them only for real control flow | CLAUDE.md | Justifies the `tsx`-assert approach above |
| `try/catch`, never `await ….catch()` | AGENTS.md Rule 11 | Any Stats fetch |
| No silent failures | AGENTS.md | Directly relevant — see the Stats read path below |

**Recommendation, outside this feature**: either populate the constitution from those two files or
stop treating it as an authority, because every speckit command that checks it is currently checking
nothing.

## Project Structure

### Documentation (this feature)

```text
specs/004-grounnel-public-site/
├── spec.md              # what and why
├── plan.md              # this file
├── tasks.md             # T001–T016
└── checklists/
    └── requirements.md  # spec quality validation
```

No `research.md`, `data-model.md`, `quickstart.md` or `contracts/`. That matches specs 002 and 003
in this repo, and core's documented decision to drop the scaffolding once the spec and tasks carry
the content. There is nothing to research — every open question was settled from telemetry and the
codebase during planning.

### Source code

```text
frontend/
├── public/
│   ├── logo.svg              # Biassemble — unchanged
│   └── logo-grounnel.svg     # new
├── src/
│   ├── lib/
│   │   ├── brand.ts          # new — resolveBrand(hostname)
│   │   └── routes.ts         # rewritten — path table replaces isGrounnelRoute()
│   ├── components/
│   │   ├── common/
│   │   │   └── BiassembleLayout.tsx   # reads brand
│   │   ├── grounnel/
│   │   │   └── HighlightedArticle.tsx # T014/T015 verdict-wording fixes
│   │   ├── AboutPage.tsx     # new
│   │   └── StatsPage.tsx     # new
│   └── App.tsx               # mounts per brand + path
└── vercel.json               # existing SPA rewrite — unchanged
```

`BiassembleLayout` keeps its filename as **legacy naming only** — Grounnel is now the umbrella and
Biassemble a separate related project, so the name no longer describes the hierarchy. Renaming it is
a pure churn cost with no user-visible effect; out of scope here, worth doing whenever that file is
next touched substantially.

## Key design decisions

### Two resolvers, deliberately independent

`resolveBrand(hostname)` answers *who am I* — name, logo, tagline, nav. The path table answers *what
am I rendering*. Brand must not carry a component reference, or the two collapse back into one
switch and the Biassemble host can no longer keep the reflection flow at `/` while the Grounnel host
puts the tool there.

Host resolution is an explicit list, not a catch-all, and it distinguishes **three** cases rather
than two: known Grounnel host, known Biassemble host, and unknown. Unknown splits again by whether
it looks like development (`localhost`, `*.vercel.app` preview) or like production. Both fall back
to Biassemble so the site always renders (FR-006), but the production-looking case also warns.

That distinction is the point. Without it, a DNS typo produces a valid Biassemble page and the deploy
looks successful while Grounnel is simply not configured — a failure that reports as a success.

### Grounnel is the umbrella

Grounnel is the main product and the public face of the work. Biassemble is a **separate related
project** at its own URL, reached by a link that describes what it does. It is not a parent, and
Grounnel is not a component of it. Anywhere the site implies otherwise is a defect against FR-014.

### ADR-002 §3 expires here

That decision justified "no router for one extra path" and produced
`isGrounnelRoute(): boolean`. Three paths across two hosts is a different situation, and a boolean
cannot express it. A small path table is sufficient — a router dependency is optional and not
recommended. Cross-navigation stays as full-reload `<a>` tags; that is orthogonal and still fine.

### The Stats read path is the one real unknown

T011 is the only task that cannot be implemented from its description alone, because the page is
public and every backend route is authenticated. Three options, in preference order:

1. **Build-time static** — a script queries telemetry and bakes aggregated values into the bundle.
   No new surface, no auth work, no runtime cost; refreshed by redeploying. Recommended for MVP.
2. **A new public read route** on `biassemble/backend` returning pre-aggregated values only.
3. Reusing an existing route — not viable, they are all key-gated.

Whichever is chosen, it returns aggregates, never raw runs or claims. Exposing arbitrary telemetry
on a public endpoint is a larger commitment than this feature should make.

**Credential boundary.** Option 1 is only safe if the aggregation runs somewhere trusted. The script
executes in a build or admin environment that holds the database credential; only the resulting
aggregate JSON is committed or bundled. No database URL, no core API key and no raw telemetry reach
the frontend build or the browser. If that separation cannot be guaranteed in the build environment,
option 1 is disqualified and option 2 is the fallback — this is the deciding criterion between them,
not convenience.

**Snapshot, not live.** Option 1 produces values fixed at build time. The page must render its
`generatedAt` timestamp and window, or a reader weeks later will take stale figures as current —
which would violate FR-009 in spirit while satisfying it literally.

### Honesty constraints on Stats are requirements, not style

FR-009/010/011 exist because of two specific measurements. Internal evaluation runs are ~96.5% of
all runs (1,912 against 70 production over 14 days), so an unfiltered count is mostly self-testing.
And a false accusation was observed on 2026-09-08 in run `2a701ffa`, so a published zero would be
false. Reporting the observed failure is also the stronger position — it demonstrates the
measurement discipline the page exists to show.

### The two UI fixes are in scope because About depends on them

`HighlightedArticle.tsx` currently labels a contradicted claim's refuting sources "Supporting
sources", and renders bare unexplained links for a claim with no verdict. The first directly
contradicts the principle FR-008 puts on the About page. Shipping the page while the product does
the opposite is worse than shipping neither.

## Complexity tracking

| Addition | Justification | Simpler alternative rejected because |
|---|---|---|
| `brand.ts` | Two domains need distinct identity from one build | Hardcoding per-deploy would need two builds and two env sets |
| Path table replacing a boolean | Three paths across two hosts | A third branch on the boolean is what ADR-002 §3 already strained to justify for the second |
| Two new pages | Explicitly requested; US3/US4 | — |

Nothing else is added. `/examples`, `/docs`, shareable assessment links, provenance display, spend
guardrails and the entity-agreement work are all deliberately out — see `tasks.md` § Deliberately
not in the MVP, and `biassemble-core/specs/018-…/FINDINGS.md` for the measured findings behind them.

## Sequencing

| Phase | Contents | Gated on |
|---|---|---|
| 1 | Domain, brand, routing (T001–T006) | — |
| 1b | T014/T015 UI fixes | independent; can ship first |
| 2 | About (T007–T010) | Phase 1 |
| 3 | Stats (T011–T013) | T011's read-path decision |
| — | T016 `vercel.json` | **done** — removed 2026-09-09, never committed or deployed |

Phase 1 carries the only real risk. Phases 2 and 3 are content on top of it.
