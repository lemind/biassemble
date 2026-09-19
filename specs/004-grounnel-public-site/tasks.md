# Tasks: Grounnel — Public Site (MVP)

Grounnel on its own domain, own brand, About + Stats. Pipeline ships as-is.
Phase 4 depends on biassemble-core spec 019.

## Phase 1 — Brand and routing

- [x] T001 Attach `grounnel.vercel.app` to the existing `biassemble-fe` project.
- [x] T002 `brand.ts` — resolve brand from hostname at runtime.
- [x] T003 Add `grn-logo.svg`.
- [x] T004 `routes.ts` — full host × path matrix; `/grounnel` stays the tool on the Biassemble host.
- [x] T005 Layout reads the brand: logo, nav, footer, title.
- [x] T006 Footer links to the sibling brand.

## Phase 2 — About

- [x] T007 `/about` page.
- [x] T008 Pipeline diagram.
- [x] T009 State the philosophy: a false accusation is worse than a missed detection.
- [x] T010 Biassemble as a related project.
- [x] T010a Worked example from a committed fixture, at the end of About.

## Phase 2b — Link previews and metadata

- [x] T024 Static title.
- [x] T025 Open Graph + Twitter + meta description.
- [x] T026 `og:image`, 1200×630 PNG.
- [x] T027 Canonical on the Grounnel host.
- [x] T028 `robots.txt`. (Superseded by T047.)
- [x] T029 `sitemap.xml`, public paths only.
- [x] T030 Keep the existing favicon on both domains.
- [x] T031 Runtime `noindex` meta on `/check/`.

## Phase 3 — Stats

- [x] T011 Generate the aggregate from a trusted script. Never put `DATABASE_URL` on the frontend project.
- [x] T012 Publish four things: window, self-testing disclosure, verdict mix, the confirmed incorrect contradiction.
- [x] T013 Never publish "0 false accusations" or a false-positive rate.

## Two live UI bugs

- [x] T014 Label refuting evidence as refuting, not supporting.
- [x] T015 Explicit wording for a claim with no verdict, gated on the state not the source count.
- [x] T016 Remove the root `vercel.json` that broke `/api/*`.

## Pre-launch guardrail

- [ ] T017 Google Cloud budget alert + Tavily usage cap. Console only, no code.

## Phase 4 — Shareable links

- [x] T018 ~~Persist the run to localStorage.~~ Superseded by T021 and reverted.
- [x] T019 ~~Nav links in a new tab.~~ Dropped.
- [x] T020 `/check/:token` page, polling at the same interval as a live run.
- [x] T021 Swap the address bar to `/check/<token>` on submit.
- [x] T022 Backend proxy route for `/assessment/:token`.

## Phase 5 — Review findings, 2026-09-09

- [x] T032 `shareToken` required in all three contract mirrors; type the API client.
- [x] T033 Disclose the permanent link before the run starts.
- [x] T034 Shared article text `readOnly`, never `disabled`.
- [x] T035 Stop a mid-run shared link reporting itself as finished.
- [x] T036 Per-client rate limits: send the internal secret, forward the real viewer IP.
- [x] T037 Keep Vercel previews blocked from the API; document why.
- [x] T039 Review round 2: failed shared runs, stacked notices, 429 handling, unbounded polling.
- [ ] T040 No frontend test runner. Run the assert files by hand: `npx tsx src/lib/<name>.test.ts`.
- [x] T041 Contact address in the footer.

## Phase 6 — SEO

- [x] T042 Per-route, per-brand head at runtime.
- [x] T043 `X-Robots-Tag` on `/check/*` via `vercel.json`.
- [x] T044 Static per-route shells for `/`, `/about`, `/stats`.
- [x] T047 SEO round 2: drop the self-defeating `Disallow: /check/`, enumerate routes, real 404s.
- [ ] T045 Custom domain. Move canonical, `og:url`, sitemap and robots together; 301 the Vercel host.
- [ ] T046 `WebApplication` JSON-LD. Optional.
- [x] T038 Delete four orphaned files.

## Phase 7 — Article-level scores

- [x] T048 `lib/articleScore.ts` — pure function over claims; shared runs score from core's authoritative counts.
- [x] T049 Suppression guards: `N < 5`, and `S + C === 0`.
- [x] T050 Colour bands per number, reusing the verdict palette.
- [x] T051 Two rings side by side, labelled Groundedness and Assessment completeness.
- [x] T052 Do not use the model's `confidence` field.
- [x] T053 Never publish a corpus average from the stats snapshot.
- [x] T054 Tests in `lib/articleScore.test.ts`.

## Phase 8 — Spend ceiling and degraded mode

- [x] T055 Price table from the invoice. Grounding search is free; production runs gemini-2.5-flash-lite.
- [x] T056a Record grounding-call tokens and thought tokens. Output cap tried and reverted.
- [ ] T056 Self-metering into Redis, key `spend:YYYY-MM`. Our meter reads ~75% of the invoice — reconcile first.
- [ ] T057 Read the budget amount from the Cloud Billing Budget API. Fallback: `MONTHLY_BUDGET_USD`.
- [ ] T058 Degraded mode at 85% — cap extraction at 5 claims.
- [ ] T059 Banner whenever a run was capped.
- [ ] T060 At 100%, read-only: no new runs, share links still open.
- [ ] T061 Google-side quota override as the backstop. Turn off Tavily auto-topup.

## Phase 9 — Post-launch

- [x] T062 Vercel Web Analytics.
- [x] T063 Serve Stats live from `/api/grounnel/stats`, snapshot as fallback, zod-parsed at the boundary.

## Known bugs

- Fixed 2026-09-13: a shared check showed no reference numbers at all, and the References list
  disagreed with the article text on both pages. Core now persists citations (spec 019, migration
  0017); one rule numbers both pages, and a pre-0017 link falls back to the claim's own sources.

## Not in the MVP

`/examples`, `/docs`, Biassemble as an integrated layer, core spec 018's findings.

## After launch

- [ ] T023 Contradiction precision audit — label 50–100 contradicted claims by hand to get a real rate.
