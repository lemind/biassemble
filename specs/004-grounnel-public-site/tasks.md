# Tasks: Grounnel — Public Site (MVP)

**Goal**: ship the site. Grounnel on its own domain with its own brand, an About page, a Stats page.
Pipeline ships **as-is** — no changes to extraction, verification, or gates.

**Nothing here depends on biassemble-core spec 018.** That work is parked; see
`../../biassemble-core/specs/018-assessment-integrity-and-guardrails/FINDINGS.md`.

---

## Phase 1 — Brand and routing

- [x] T001 **Done 2026-09-09.** `grounnel.vercel.app` added to the existing **`biassemble-fe`**
  Vercel project alongside `frontend-topaz-eight-10.vercel.app`. One deployment serves both; no new
  project, no new backend, no Inngest change.

  Note: Vercel no longer allows adding arbitrary `*.vercel.app` subdomains through the Domains tab
  in every flow — if `grounnel.com` is added later it attaches to this same project the same way.
  Env vars are per *environment*, not per *domain*, so both hosts share one build and one
  `VITE_API_URL` — which is why branding resolves at runtime (T002), not at build time.

  Frontend and backend are and remain **separate Vercel projects, cross-origin**. A second domain
  changes nothing about that — it adds no backend, no Inngest registration, no CORS requirement.
  The reason for one deployment is one build and one set of env vars, not same-origin.

  **Acceptance covers both hosts, not just DNS.** "Domain attached" can pass while the runtime
  resolver is wrong, so verify all six: Grounnel host → Grounnel branding → tool at `/`; Biassemble
  host → Biassemble branding → reflection flow at `/` → Grounnel app still at `/grounnel`.
- [ ] T002 `frontend/src/lib/brand.ts` — `resolveBrand()` from `window.location.hostname` →
  `{ id, name, logo, tagline, nav }`. Brand is identity only; the path table (T004) decides which
  component renders. Keep them orthogonal.

  Three cases, not two — an unknown host is not the same as a development host:

  | host | brand |
  |---|---|
  | known Grounnel host | Grounnel |
  | known Biassemble host | Biassemble |
  | `localhost`, `*.vercel.app` preview | Biassemble, plus a dev-console line naming the resolved brand |
  | anything else (production-looking, unrecognised) | Biassemble, plus a visible console warning |

  The last row is the one that matters: without it, a DNS typo renders a perfectly valid Biassemble
  page and the deploy looks successful while Grounnel is simply not configured.

  Hosts live as named **arrays** in `brand.ts` — one explicit list, not a regex, not repeated
  across files. Real values as of 2026-09-09:

  ```ts
  const GROUNNEL_HOSTS   = ["grounnel.vercel.app"];      // + "grounnel.com" when bought
  const BIASSEMBLE_HOSTS = ["frontend-topaz-eight-10.vercel.app"];
  ```

  Logo assets: `grn-logo.svg` (Grounnel) / `logo.svg` (Biassemble).
- [x] T003 **Done 2026-09-09.** `frontend/public/grn-logo.svg` added. `logo.svg` (Biassemble)
  untouched.
- [ ] T004 Replace `isGrounnelRoute()` with a small path table matching on `window.location.pathname`
  (not the full URL — query strings and hashes must not affect resolution): `/`, `/about`, `/stats`. Grounnel
  host mounts the Grounnel app at `/`; Biassemble host keeps the reflection flow at `/` and
  `/grounnel` where they are.
- [ ] T005 Layout reads the brand — logo, wordmark, nav, footer. `document.title` per brand.
- [ ] T006 Footer link to Biassemble, framed as a sibling rather than a parent:
  *Also from this project: **Biassemble** — analyze cognitive biases in text.*
  Grounnel is the umbrella; Biassemble is a separate related project keeping its own URL.

## Phase 2 — About

- [ ] T007 `/about` — what Grounnel is, in one paragraph.
- [ ] T008 Pipeline diagram: text → claims → evidence → ranked sources → verdicts.
- [ ] T009 The philosophy, stated plainly: **a false accusation is worse than a missed detection.**
  When evidence is weak Grounnel says "not verified" rather than calling something false.
- [ ] T010 One short paragraph on Biassemble as a **related project**, not a parent — what it does
  (cognitive-bias analysis of text), that it lives at its own URL, and that combining the two
  analyses over the same text is a deliberate future direction, not shipped.

## Phase 3 — Stats

- [ ] T011 Stats read path. The page is public; every existing backend route is authenticated.
  **Decided: pre-generated static JSON.** (A public read route on `biassemble/backend` is the
  fallback if the aggregate ever needs to be live. Reusing an existing route is not viable — all
  key-gated.)

  Only **already-aggregated values** cross the boundary — never raw runs or claims. Illustrative
  shape only; do not bake these numbers:

  ```json
  { "generatedAt": "<ISO timestamp>", "window": "<start>/<end>",
    "productionRuns": 0, "productionClaims": 0,
    "falseAccusations": { "observed": 0, "ofClaims": 0 } }
  ```

  **Filter `source = 'production'`** — ~96.5% of runs are internal evals (1,912 vs 70 over 14 days)
  and must not inflate a public number.

  **Decided mechanism for MVP — option 1, run outside the build.** The Vercel frontend build has no
  production database access and must not be given any. So:

  ```text
  trusted local/admin script (has DATABASE_URL)
      ↓  writes aggregate only
  frontend/src/data/stats.json  — committed
      ↓
  normal frontend build — no DB, no secrets
  ```

  Refreshed by re-running the script and committing. Never add `DATABASE_URL` to Vercel frontend
  env vars — `VITE_*` vars are public, and a non-`VITE_` var still exposes the DB to build code for
  no gain. Commit only the aggregate; never raw telemetry.
- [ ] T012 Publish only figures with a stated denominator, window and definition — and, because
  option 1 produces a **snapshot rather than live statistics**, render `generatedAt` and the window
  on the page itself. A reader six weeks later must not mistake stale values for current ones.
- [ ] T013 **Do not publish "0 false accusations".** One was observed on 2026-09-08 in run
  `2a701ffa`. Either report it honestly or omit the metric — do not print a zero a reader can
  disprove.

  **Name the metric for what it actually measures.** "False accusation" reads as *true claim →
  contradicted*, but the operational definition is broader: *contradicted verdict → cited evidence
  doesn't establish a contradiction*. Different populations. Publish it as:

  > **Observed incorrect contradictions: 1 / 935 production claims** (window stated)
  > A claim was returned as `contradicted`, but the cited evidence did not actually establish a
  > contradiction.

  Then note separately that the one observed incident involved a **subjective** claim with no truth
  value — so it isn't a claim-truth false positive in the strict sense. That's more defensible than
  either publishing zero or overclaiming. Define it internally even if the metric doesn't ship.

---

## Two live UI bugs — fix before showing anyone

Both are in `frontend/src/components/grounnel/HighlightedArticle.tsx` and both are visible on every
result today. T014 directly contradicts the philosophy T009 puts on the About page.

Fix both together — they are the same defect class (source links whose wording doesn't match the
verdict above them) in the same block. Line numbers below are **post-rebase**.

- [ ] T014 **`sourcesUncited`** (line ~126) includes `'contradicted'`, and its render branch
  (line ~219) emits *"Supporting sources (no exact sentence matched):"*. Symbols are authoritative;
  line numbers are navigation only. A contradicted claim shows its refuting
  evidence labelled as supporting it. Split the wording: affirmative verdicts keep *"Supporting
  sources"*, `contradicted` gets **"Refuting sources"**.
- [ ] T015 **`sourcesAreUnconfirmed` / `sourcesUncited`** (line ~120): a claim with `verdict === null` (status `pending`/`failed`) and
  `sources.length > 0` matches none of the four explanatory flags and renders bare source links, so
  a reader can't tell whether verification failed, is pending, or never evaluated the sources. Give
  it explicit wording — **"Verification incomplete — sources retrieved but not evaluated"** — rather
  than letting bare links imply the evidence backs anything. (`excluded` is fine; `notChecked`
  covers it.)

  Gate the new branch on the **state** — `verdict === null`, i.e. the claim reached no verdict —
  not on `sources.length > 0` as a proxy for it. Today those coincide; the condition should say
  what it means so it stays correct if they stop coinciding.

## One deploy landmine — resolved

- [x] T016 **Removed 2026-09-09, before implementation.** The untracked root `vercel.json` moved the
  backend to `/_/backend` with no `basePath`, so `/api/*` and `/api/inngest` didn't follow and the
  SPA catch-all answered them with **200 + HTML** instead of 404 — axios would have resolved and
  parsed HTML as a response, and Inngest would have registered zero functions. It was never
  committed and never deployed. `frontend/vercel.json` is unchanged and still supplies the SPA
  rewrite that `/grounnel` and the new paths depend on.

---

## Pre-launch guardrail

- [ ] T017 Google Cloud budget alert on the Gemini project + Tavily usage cap, **before DNS
  activation**. No code, ~2 minutes. Spend currently has no ceiling and one call has consumed
  808k tokens. Application-level spend breakers stay in core spec 018 — not here.

**Launch checklist**: T014, T015, T016, T017 all done before the domain goes live.

---

## Phase 4 — Session persistence and shareable links

Added 2026-09-09. Today `runId`, `articleText` and `sessionId` live only in React `useState` — no
`localStorage`, no `sessionStorage`, no cookie. So a refresh, a new tab, or clicking any nav link
destroys a run that took ~200s to produce. Adding About and Stats to the nav makes that worse.

- [ ] T018 Persist the current run to `localStorage` (not `sessionStorage` — the ask is that a new
  tab sees the same run). Store `runId` + `articleText`; rehydrate on mount. Two tabs share one
  slot and the newer run wins; acceptable for MVP.
- [ ] T019 Nav links open About/Stats in a new tab (`target="_blank"`) until T020 lands, so an
  in-flight check survives a click. Cheap interim guard.
- [ ] T020 `/check/:token` page — fetch a shared assessment and render the stored text with claim
  highlights, reusing `HighlightedArticle`. This is the real fix: a URL you can return to, rather
  than browser state you can lose.
- [ ] T021 Surface the link when a run completes — visible, copyable, and present while the run is
  still in flight (core assigns the token at creation, so it exists before the result does).
- [ ] T022 Proxy route `backend/src/app/api/grounnel/assessment/[token]/route.ts`. **Required, not
  optional**: biassemble-core is key-gated and has no CORS, so the browser cannot call it directly.
  Mirrors the existing `grounnel/status/[id]` proxy.

**Depends on biassemble-core spec 019** (`share_token` + `GET /assessment/:token`) — see
`../../biassemble-core/specs/019-assessment-permalink/tasks.md`. T018 and T019 are frontend-only and
can ship first.

**Note**: shared links are public, unguessable and never expire, and the documents are often
personal essays naming real people. That was the decision on 2026-09-08; 019's checklist flags that
no revocation path exists, which is worth settling before this goes live rather than after.

---

## Deliberately not in the MVP

- `/examples` — a curated list of shared links. Cheap once Phase 4 lands, but still later.
- `/docs`.
- Biassemble as an integrated analysis layer — separate link only, for now.
- Everything in spec 018: entity-agreement gate, coverage boundaries, permalinks, provenance,
  spend guardrails. Real findings, not MVP blockers.

## After launch

Spend ran ~$2/day during heavy self-testing at ~$0.036/run, so public traffic is cheap. T017 is the
ceiling; anything more is core spec 018.
