# Implementation Plan: Grounnel — Frontend Fact-Check UI

**Branch**: `grounnel` | **Date**: 2026-08-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-grounnel-frontend/spec.md`

## Summary

Build the `/grounnel` page: a textarea + run button, backed by a 5s poll loop against the already-built `biassemble/backend` proxy, rendering the submitted article with claim spans colored by verdict, a checked/total progress indicator, and a per-claim source list. The backend side of this feature (proxy routes, session linkage) is **already implemented and verified against this plan's needs** — see "Backend (already complete)" below. The only new work is frontend: routing, API client functions, a polling hook, and the results UI, including a client-side best-effort text-matching step to locate each claim's span inside the pasted article (`biassemble-core` provides no character offsets).

## Technical Context

**Language/Version**: TypeScript 5.x+ (strict), matching `frontend/tsconfig`.

**Frontend**: Vite + React 19 (React Compiler via `babel-plugin-react-compiler`), DaisyUI + Tailwind v4, Zod, axios → `VITE_API_URL`. No new dependencies.

**Backend**: Next.js 15 API routes — already built, this feature only consumes `POST /api/grounnel/extract` and `GET /api/grounnel/status/:id`.

**Testing**: No new test-runner dependency — `frontend/package.json` has no `vitest` (only `backend/` does) and this plan adds none. `matchClaimSpans` (the highest-value thing to test, being pure) is tested via plain `assert`-based checks executed through `tsx`, already a `frontend/` devDependency used today for `scripts/generate-types.ts` — same tool, new script, no new package. Manual smoke test against `AI_CLIENT_MODE=dev-mock` for the full poll loop.

**Performance**: Poll cadence 5s (ADR-002 §5, revised 2026-08-11) — Grounnel's pipeline is a longer multi-claim process than the reflection product's single assessment call, not the same 2s cadence as `usePollAssessment`, but tighter than the original ~10s assumption since the pipeline streams claim-by-claim and 10s reads as laggy against that.

**Constraints**: No router dependency — single `window.location.pathname === '/grounnel'` check in `App.tsx` (ADR-002 §3), named as a small `isGrounnelRoute()` helper rather than an inline condition — purely a readability naming choice (AGENTS.md's "descriptive names" rule), not a routing abstraction; still no router, still one path. No claim-offset data from the backend — highlighting is best-effort, not exact.

## Backend (already complete)

Not just read from source — actually run and hit live, 2026-08-11:

| Piece | File | Verification |
|---|---|---|
| `POST /api/grounnel/extract` | `backend/src/app/api/grounnel/extract/route.ts` | **Live-tested** — ran `next dev` locally (`AI_CLIENT_MODE=dev-mock`), `curl POST` returned `202 {"id": ...}`. Session creation against the real `DATABASE_URL` succeeded (would 500 otherwise) |
| `GET /api/grounnel/status/:id` | `backend/src/app/api/grounnel/status/[id]/route.ts` | **Live-tested** — `curl GET` on the id above returned `200` with the full `StatusResponse` shape |
| Contracts | `backend/src/lib/ai/contracts.ts` | Field-for-field match confirmed twice: once against `biassemble-core/src/contracts/grounnel.schemas.ts` source, and again against a real production response body (see Design Decisions below) — zero drift in either direction |
| Dev-mock parity | `backend/src/lib/ai/dev-mock-client.ts` | **Live-tested** — the `202`/`200` responses above came from this path |
| `AI_CLIENT_MODE=core` path | `backend/src/lib/ai/core-client.ts` | **Not live-tested through this repo's proxy.** A real `biassemble-core` call was made directly against `https://biassemble-core.vercel.app` (bypassing this repo entirely) to check claim-text behavior — that confirms `biassemble-core` itself works and its response shape matches `contracts.ts`, but does **not** confirm `core-client.ts`'s own `postCore`/`getCore` request-building, auth header, or `X-Grounnel-Client-IP` forwarding actually work end-to-end. Flagging this explicitly rather than letting the dev-mock test above stand in for it. |

This plan's frontend work is a pure consumer of this surface; no backend PR is part of this feature. The one open gap (`core`-mode path, this repo's proxy specifically) is pre-existing from ADR-001, not something this frontend plan introduces or needs to resolve to proceed.

## Design Decisions

### Claim → text span matching (the core technical risk)

`biassemble-core`'s `ClaimSchema` has no offset/start/end field — deliberately deferred (`biassemble-core/specs/009-grounnel/tasks.md`, T039-T041 notes). **Confirmed live, not just inferred from the prompt** (2026-08-11, direct `POST /extract` + `GET /status/:id` against the real deployed `https://biassemble-core.vercel.app`, a 5-sentence/14-claim test article): only **4 of 14** returned claims were exact verbatim substrings of the submitted text. The other 10 all had one of these transformations applied — every one of them a real, observed case, not a hypothetical:

- An appositive clause removed from its sentence (`"Nauru, the world's smallest island nation by population, briefly became..."` → claim drops the appositive entirely) or promoted into its own standalone sentence (`"The Republic of Nauru is the world's smallest island nation by population."` — a sentence that never existed verbatim in the source).
- A pronoun resolved to its referent (`"...making it the tallest mountain..."` → `"Mount Everest is the tallest mountain..."`).
- An elliptical construction resolved with an explicit subject (`"...some cut with hundreds of triangular teeth"` → `"Some bronze gears in the Antikythera mechanism were cut with hundreds of triangular teeth."`).
- A participial appositive turned into a standalone finite clause (`"...Vault, built into a mountainside in Norway, was breached..."` → `"The Svalbard Global Seed Vault was built into a mountainside in Norway."`).

So `claim.text` is reliably close to the source in wording and content, but reliably **not** a guaranteed verbatim substring — matching happens entirely client-side, as a pure function, recomputed from `(articleText, claims[])` on every poll tick (claim counts are small — tens, not thousands — so recomputation cost is negligible; no memoization layer until profiling says otherwise, per AGENTS.md "measure before optimizing"):

1. **Exact match**: case-insensitive substring search for `claim.text` in the article. If found, that's the span.
2. **Fallback — sentence-level match**: naive-split the article into sentences (regex on `[.?!]+\s+`), score each sentence against `claim.text` via token-overlap (lowercased word-set Jaccard, stopwords ignored), take the highest-scoring sentence if its score is **≥ 0.5** (i.e. at least half the union of the two word sets overlaps). That whole sentence becomes the span. This value is a starting point, not a load-bearing constant tuned by measurement yet — `matchClaimSpans.test.ts` must include cases from the real 4-verbatim/10-paraphrased sample already on record (Design Decisions above) so the threshold is validated against real transformations (appositive removal, pronoun resolution, ellipsis resolution) before shipping, and is easy to revisit as one named constant if real usage shows it's wrong. The naive sentence splitter itself has known failure modes (abbreviations like "Dr.", decimal-adjacent punctuation, ellipses) that can produce a malformed "sentence" to score against — accepted for v1 on the same basis as `[.?!]+\s+`'s existing "naive" label: a bad split can only ever cause a *missed* highlight (falls through to step 3), never a wrong verdict color, so it fails safe.
3. **No match**: if nothing clears the threshold, the claim is not highlighted — it still appears in the source list (FR-010). This is a known, accepted limitation, not a bug to chase; exact offsets would require a `biassemble-core` schema change, which is out of scope (see spec.md Assumptions).
4. **Overlaps**: since EXTRACT splits compound sentences into multiple atomic claims, two claims can resolve to overlapping/identical spans. Resolved by **span start position in the article, not array order** — the claim whose matched span starts earliest in the text wins the highlight; on an exact tie (identical span), the lower `claim.id` (lexical string compare) wins, purely for determinism. This is deliberately independent of `claims[]`'s array order, which `biassemble-core` gives no ordering guarantee for across polls as claims move `pending` → `done` — an array-order tie-break would let the same on-screen span flip which claim (and which color) it displays between two polls with nothing about the underlying claims having changed, which a position- or id-based tie-break can't do since neither depends on array position. The losing claim still appears in the source list (Edge Cases). No nested-span rendering — deliberately, to avoid a much more complex text-layout problem for a v1.

Position-based tie-break has a real, known cost: if a `supported` (green) claim and a `contradicted` (red) claim resolve to the same span, only the earlier-position one is ever visible — a user could see green over a real, hidden contradiction. Accepted for v1 (per AGENTS.md "measure before optimizing," don't build a resolution policy before knowing how often this actually happens), but not silently: `matchClaimSpans` logs a `console.warn` (dev-only) with both claim ids whenever a tie-break discards a claim, so collision frequency is observable rather than invisible. If real usage shows this matters, the natural next step is a severity-ordered tie-break (e.g. `contradicted` > `unsupported`/`partially_supported` > `supported`, with `pending`/`failed` always losing to any real verdict) instead of position — deliberately not built now, since it's not needed until the logged data says it is.
5. **Runs over every claim regardless of `status`**, not just `done` ones — `pending` claims (no verdict yet) are matched the same way as `done` ones, using their `text` field (present from the moment a claim is extracted, independent of verification status). This is required by FR-005: a not-yet-checked claim must show a running/spinner state *in the article body once a span is matched*, which is only possible if pending claims go through this same matching step, not a verdict-gated subset of it.

**Matching is best-effort presentation only — it never affects verdict computation.** `matchClaimSpans` decides *where a claim is shown* in the reprinted article; it has no bearing on *what the claim's verdict is*, which is computed entirely by `biassemble-core` and passed through unchanged. A claim that fails to match anything (step 3) still keeps its real verdict and sources — it's just not visually located in the text. Stated explicitly here so a future reader never mistakes this matcher for part of the trust boundary — it isn't, and shouldn't be extended to become one (e.g. no "adjust confidence based on match quality").

**`claim.id` is the only key, everywhere downstream — no re-guessing after the match.** Every claim already carries a stable UUID `id` from `biassemble-core` (confirmed live in both test runs above — every one of 14 and both of 2 returned claims had one). The fuzzy step above runs exactly once, to answer exactly one question: *where does this `claim.id` belong in the article, if anywhere*. Its output is `matchClaimSpans(articleText, claims): Map<string /* claim.id */, Span | null>`. Every consumer downstream — `HighlightedArticle`'s span rendering, its tooltip content, `ClaimSourceList`'s grouping — looks up verdict/sources/evidence by `claim.id` against the claims array directly (a plain lookup, O(1) by id), never by re-matching or re-deriving identity from text content, array position, or span coordinates a second time. Text-matching answers "where," `claim.id` answers "which" — the two are never conflated, and nothing downstream of the initial match re-opens the "where" question.

Lives in `frontend/src/lib/matchClaimSpans.ts` as a pure, independently unit-testable function — not a hook, not a component — since it has no I/O and no React lifecycle dependency.

**Tooltip only renders when a claim has ≥1 source (FR-008).** A matched span whose claim has zero sources still gets its verdict color, but `HighlightedArticle` must not attach a tooltip to it — an empty "links to sources" popover on hover is worse than none. This is a render-time check (`claim.sources.length > 0`), not a matching concern, but stated here since it's easy to build the tooltip unconditionally onto every matched span and only notice the empty case by accident.

### Verdict → color mapping

Spec only fixes green (`supported`) and red (`contradicted`); the rest is this plan's call, chosen for clear visual separation and to avoid any color reading as a shade of green/red. Per FR-007, color is never the only cue — each row also gets a non-color icon shown at the same hover/focus point as the sources tooltip, so the mapping is usable without color vision:

| State | Color (DaisyUI token) | Non-color cue |
|---|---|---|
| `supported` | `success` (green) | check icon |
| `contradicted` | `error` (red) | X icon |
| `partially_supported` | `warning` (amber) | half-check / tilde icon |
| `unsupported` | `neutral` / gray-brown, distinct from pending-gray | question-mark icon |
| `unverifiable` | `info` (blue) | dashed question-mark icon |
| claim `status: pending` (not yet checked) | plain gray, subtle pulse animation — not a verdict color | small spinner |
| claim `status: failed` (verification itself errored) | muted gray with a dashed outline — visually distinct from `unverifiable`, never conflated with it (FR-012) | warning-triangle icon |

Exact icon set (or a single sprite/emoji shorthand) is a v1 implementation detail, not fixed further here — the requirement is "a non-color cue exists per state," not a specific icon library (no new dependency needed; inline SVG or Unicode symbols suffice).

### Component structure — cumulative reveal, not phase-gated

Unlike `useReflectionFlow`'s `landing → qa → assessing → results` full-screen phase switch, Grounnel is a single persistent view: the textarea never disappears, results accumulate below it as polling progresses (per the feature description — "during process BE should return current state we have as results"). State is owned by a `useGrounnelRun` hook (analogous role to `useReflectionFlow`, different shape — no phase enum, just `{ runId, status, error }` plus derived polling), not a multi-phase state machine.

```
GrounnelApp
├── ArticleInput          — textarea + run button; disabled while a run is in flight
├── GrounnelProgress       — checked/total + running state; only rendered once a run exists
│                            (FR-011) also renders a "results are partial (claim limit reached)"
│                            note when the polled status has caps_hit: true — this is the only
│                            place caps_hit is surfaced, no separate component for it
├── HighlightedArticle     — article text + matched spans, colored by verdict, tooltip → sources
└── ClaimSourceList        — per-claim source links (≤2 shown), grouped by claim
```

Resubmission (FR-013) is handled inside `useGrounnelRun`: starting a new run tears down the previous polling interval before starting the new one, and replaces (not merges) the displayed run state.

**`GrounnelProgress`'s own states**, to close two gaps a bare "checked/total display" leaves open:
- **Before the first successful poll returns** (a run exists — `useGrounnelRun` has a `runId` — but no `GrounnelStatusOutput` has arrived yet), `progress.checked`/`.total` don't exist yet. Render an indeterminate "Finding claims…" state, never a numeric `0 / 0` (spec.md edge case).
- **While `status` is non-terminal** (`extracting`/`verifying`), the checked/total counter itself carries a subtle pulse/animation — not just the individual pending claim spans in the article body — so FR-005's "running state... in the progress indicator" has an actual visual treatment, not just an implied one. Once `status` reaches `done`/`failed`, the animation stops and the counter is static.

**`ClaimSourceList`'s ordering**: claims are listed in the order their matched span appears in the article (by `matchClaimSpans`' resolved start position), not `claims[]`'s own array order or completion order — consistent with how overlap resolution already treats position as the meaningful ordering signal (Design Decisions above). Claims with no matched span (FR-010) are appended at the end, in their `claims[]` array order (no position to sort by).

### Polling model

`usePollGrounnelStatus` follows `usePollAssessment`'s shape (`setInterval` + cleanup on unmount/dep-change, swallow-and-retry on transient fetch errors per spec.md's edge case) with two deliberate differences: 5s interval (not 2s), and no fixed overall *cutoff* — Grounnel runs are polled until the response's own `status` reaches `done`/`failed`, rather than the frontend enforcing an arbitrary abort the reflection flow needs (single bounded assessment call) but Grounnel does not (variable, potentially many-claim runs).

No hard cutoff doesn't mean no feedback: `GrounnelProgress` uses the already-returned `started_at`/`elapsed_seconds` to show a soft "this is taking longer than usual" note once elapsed time passes a fixed soft threshold (60s) with `status` still non-terminal — covering the case where an upstream issue stalls a run without ever producing a clean `status: failed`. This is a visibility aid only, not a poll-stopping timeout; polling continues regardless.

**5s, not the original ~10s assumption — revised 2026-08-11, user override.** A prior pass through this plan kept 10s (`biassemble-core/specs/009-grounnel/spec.md`'s own stated assumption, carried in by ADR-002 §5) on the grounds that changing it was a backend-load/product tradeoff, not a frontend call to make unilaterally. The user then explicitly said to use 5s — ADR-002 §5 itself has been revised to record this. Still well above `usePollAssessment`'s 2s (a longer, variable multi-claim process, not a single bounded call), just a tighter number than originally assumed, since the pipeline streams claim-by-claim and 10s read as laggy against that.

## Project Structure

### Documentation (this feature)

```text
specs/002-grounnel-frontend/
├── spec.md
├── plan.md               # this file
└── tasks.md              # written — 21 tasks across 5 phases, see tasks.md
```

### Source Code

```text
frontend/src/
├── api/
│   └── client.ts                    # + submitGrounnelText, getGrounnelStatus (ADR-002 §4)
├── hooks/
│   ├── usePollGrounnelStatus.ts     # new — 5s poll loop
│   └── useGrounnelRun.ts            # new — owns run id/status/error, resubmission teardown
├── lib/
│   └── matchClaimSpans.ts           # new — pure span-matching function (+ .test.ts)
├── types/
│   └── grounnel.ts                  # new — mirrors backend/src/lib/ai/contracts.ts Grounnel types
├── components/grounnel/             # new directory (ADR-002 §7)
│   ├── GrounnelApp.tsx
│   ├── ArticleInput.tsx
│   ├── GrounnelProgress.tsx
│   ├── HighlightedArticle.tsx
│   └── ClaimSourceList.tsx
└── App.tsx                          # + pathname branch to <GrounnelApp />, before existing phase logic
```

No changes to `backend/`, no changes to `components/` (reflection product), no changes to `hooks/useReflectionFlow.ts` or `usePollAssessment.ts` — purely additive (ADR-002 §7).

## Constitution Check

*GATE: Pass, with one named complexity tradeoff — see Complexity Tracking below.* No new dependencies. KISS: cumulative-reveal UI over a phase state machine matches the actual UX described, not an imported pattern. Typed outputs via Zod-mirrored types. No prompts/model IDs in this repo (none needed — this feature has no direct AI calls). Public/private boundary unchanged: frontend never calls `biassemble-core` directly (FR-015).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Client-side fuzzy text matching (`matchClaimSpans.ts`) instead of exact offset lookup | `biassemble-core` provides no offsets and claim text isn't guaranteed verbatim — confirmed live, 10 of 14 claims in a real test run were not exact substrings (see Design Decisions) | Exact substring-only matching would silently fail to highlight ~70% of claims in the observed sample — unacceptable against FR-006/FR-010/SC-002. Requesting an offset field from `biassemble-core` is out of scope for this session and was already explicitly deferred there (`biassemble-core/specs/009-grounnel/tasks.md`). |

## Phase mapping (see tasks.md)

| Phase | This plan | tasks.md |
|---|---|---|
| Backend | Already complete (see above) | N/A — no new backend tasks |
| Frontend — data layer | API client + types + span-matching util | Phase 1: T001–T003 |
| Frontend — polling/state | `usePollGrounnelStatus` + `useGrounnelRun` | Phase 1: T004–T005 |
| Frontend — UI | `components/grounnel/*` + `App.tsx` routing | Phases 2–4: T006–T016 |
| Tests | Unit tests for `matchClaimSpans`, manual dev-mock/core smoke tests | Phase 5: T017–T021 |
