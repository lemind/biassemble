# Tasks: Grounnel — Public Site (MVP)

**Goal**: ship the site. Grounnel on its own domain with its own brand, an About page, a Stats page.
Pipeline ships **as-is** — no changes to extraction, verification, or gates.

**No pipeline change depends on biassemble-core spec 018** — those findings are parked; see the
**biassemble-core** repo, `specs/018-assessment-integrity-and-guardrails/FINDINGS.md`.
**Phase 4 does depend on core spec 019** (share token + durable read). 018 and 019 are different
things; permalinks moved from the former to the latter.

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
- [x] T002 `frontend/src/lib/brand.ts` — `resolveBrand()` from `window.location.hostname` →
  `{ id, name, logo, tagline, nav }`. Brand is identity only; the path table (T004) decides which
  component renders. Keep them orthogonal.

  Three cases, not two — an unknown host is not the same as a development host:

  | host | brand |
  |---|---|
  | known Grounnel host | Grounnel |
  | known Biassemble host | Biassemble |
  | `localhost`, `*.vercel.app` preview | Biassemble, plus a dev-console line naming the resolved brand |
  | anything else (production-looking, unrecognised) | Biassemble, plus a visible console warning |

  A DNS typo therefore renders a valid Biassemble page and the deploy looks successful while
  Grounnel is not configured. **Accepted** — a console warning is the whole mitigation; T001's
  six-case check is what actually catches it. No on-page indicator.

  Hosts live as named **arrays** in `brand.ts` — one explicit list, not a regex, not repeated
  across files. Real values as of 2026-09-09:

  ```ts
  const GROUNNEL_HOSTS   = ["grounnel.vercel.app"];      // + "grounnel.com" when bought
  const BIASSEMBLE_HOSTS = ["frontend-topaz-eight-10.vercel.app"];
  ```

  Logo assets: `grn-logo.svg` (Grounnel) / `logo.svg` (Biassemble).

  **Done 2026-09-09.** `classifyHost`/`brandForHost` are pure and tested; `resolveBrand()` reads
  `window.location.hostname` and logs once. Brand gained `origin` (canonical URL) so the footer
  link doesn't write a hostname outside the two arrays.
- [x] T003 **Done 2026-09-09.** `frontend/public/grn-logo.svg` added. `logo.svg` (Biassemble)
  untouched.
- [x] T004 Replace `isGrounnelRoute()` with a path table matching on `window.location.pathname`
  (not the full URL — query strings and hashes must not affect resolution). It must cover the whole
  host x path matrix, not three paths:

  | path | Grounnel host | Biassemble host |
  |---|---|---|
  | `/` | tool | reflection flow |
  | `/grounnel` | redirect to `/` | **tool — existing links, FR-002/SC-002** |
  | `/about` | About | About |
  | `/stats` | Stats | Stats |
  | `/check/:token` | shared assessment | shared assessment |
  | anything else | not-found | not-found |

  `/grounnel` and the variable `/check/:token` segment are the two that a naive three-path table
  drops — the first breaks links we promised not to break, the second is Phase 4. Acceptance is the
  six-case matrix from T001, verified on both hosts.

  **Done 2026-09-09.** `resolveRoute(pathname, brand)` in `routes.ts`, 9 assert tests covering the
  matrix. Fixed paths compare case-insensitively but the `/check/:token` segment keeps its case —
  the token is base64url. Verified on the pure resolver; both hosts still need the T001 walk-through.
- [x] T005 Layout reads the brand — logo, wordmark, nav, footer. `document.title` per brand.
  **Done 2026-09-09.** Layout takes `brand` + `activePath`; title is `${name} — ${tagline}`, set in
  `App.tsx`. About/Stats/check are routed but render not-found until their own phases land.
- [x] T006 Footer link to Biassemble, framed as a sibling rather than a parent:
  *Also from this project: **Biassemble** — analyze cognitive biases in text.*
  Grounnel is the umbrella; Biassemble is a separate related project keeping its own URL.
  **Done 2026-09-09.** Footer renders `siblingBrand(brand)`, so each host links to the other by its
  canonical origin and the wording is symmetric.

## Phase 2 — About

- [x] T007 `/about` — what Grounnel is, in one paragraph.
  **Done 2026-09-09.** `frontend/src/components/AboutPage.tsx`, one page for both hosts.
- [x] T008 Pipeline diagram: text → claims → evidence → ranked sources → verdicts.
  **Done 2026-09-09.** Five numbered cards, CSS grid — no diagram library.
- [x] T009 The philosophy, stated plainly: **a false accusation is worse than a missed detection.**
  When evidence is weak Grounnel says "not verified" rather than calling something false.
  **Done 2026-09-09.** Its own section, and it names the declined-verdict counts as the visible proof.
- [x] T010 One short paragraph on Biassemble as a **related project**, not a parent — what it does
  (cognitive-bias analysis of text), that it lives at its own URL, and that combining the two
  analyses over the same text is a deliberate future direction, not shipped.

  **Done 2026-09-09.** Section reads from `siblingBrand()`, so it is symmetric on both hosts.
- [x] T010a **Worked example on the landing page** — one real check shown end to end: pasted text →
  extracted claims → one `contradicted` with its passage and source URL visible. Probably worth more
  than the whole stats page for answering "should I trust this?".

  **A committed fixture, not a live run.** Freeze one real past assessment as JSON in the repo and
  render it statically. That keeps "pipeline ships as-is" and "no new measurement" true, costs no
  API calls per visitor, and cannot break on the landing page. Pick the example deliberately — it
  should show a contradiction with clean, checkable evidence.

  **Done 2026-09-09. Moved off the landing page the same day** — on the tool page it sat between a
  person and the thing they came to do. It now closes the About page, which is where reference
  material belongs. `WorkedExample.tsx`, behind a "Show it" link. Fixture is `frontend/src/data/workedExample.ts`, generated by core's
  `scripts/gen-worked-example.ts` from production run `bb62670f` (prompts 1.7.0/4.6.0): two
  paragraphs of a travel diary, 3 claims, 1 contradicted, sources verbatim. The text was written
  for testing and the page says so. Citations are not persisted in `grounnel_claims`, so the
  example shows no inline citation numbers where a live run would.


## Phase 2b — Link previews and metadata

`frontend/index.html` currently has **no `og:*` tags, no `twitter:*` tags, no meta description** —
only a `<title>`. So every link shared to Slack, Twitter or LinkedIn previews as a bare URL today,
on both domains. This matters more once T021 starts handing people shareable check links.

**Decision: the static `<head>` is Grounnel's.** Grounnel is the umbrella and the public product;
Biassemble is a legacy side project on an old URL. So the one shared `index.html` carries Grounnel's
title, description, image and canonical. The Biassemble domain inherits them — accepted, and
consistent with the hierarchy decision.

- [x] T024 Replace the static title in `frontend/index.html`. Today it reads
  `Biassemble — Identify Cognitive Biases`; it becomes Grounnel's, e.g.
  `Grounnel — Verify the claims in any text`. This is what non-JS crawlers and every social scraper
  read.
- [x] T025 Open Graph + Twitter card tags, Grounnel-branded: `og:title`, `og:description`,
  `og:image`, `og:url`, `og:type`, `twitter:card` (`summary_large_image`), plus a
  `<meta name="description">`. Currently there are **none** — every shared link previews as a bare
  URL on both domains.
- [x] T026 `og:image` asset — 1200×630 PNG in `frontend/public/`. `grn-logo.svg` is 424 bytes and
  won't work as a social card; scrapers want a raster image at that ratio.
- [x] T027 Canonical link pointing at the Grounnel host, so the two domains serving identical
  content don't compete as duplicates and Grounnel is the one that gets indexed.
- [x] T028 `frontend/public/robots.txt` — allow `/`, `/about`, `/stats`; **disallow `/check/`**.
  Shared assessments often name private individuals.
- [x] T029 `frontend/public/sitemap.xml` listing the Grounnel host's public paths only
  (`/`, `/about`, `/stats`). Never the check links.
- [x] T030 **Decided 2026-09-09: keep the existing `favicon.svg` on both domains.** No Grounnel
  favicon for the MVP. Note this is deliberately inconsistent with T024–T027, where the shared
  `<head>` is Grounnel-branded — the tab icon stays Biassemble's.
- [x] T031 `noindex` for `/check/:token`. **This is an SPA with one `index.html`, so there is no
  per-route static meta tag** — the real controls are `robots.txt` Disallow (T028) and core 019
  T009's `X-Robots-Tag` on the API response. This task is only the runtime belt-and-braces: inject
  a `noindex` meta into `document.head` when the path matches. Drop it if T028 + 019 T009 are judged
  sufficient.

**Done 2026-09-09 (T024–T029, T031).** `index.html` carries Grounnel's title, description,
canonical, OG and Twitter tags. `public/og-grounnel.png` is 1200x630, generated from `grn-logo.svg`
with the verdict vocabulary on it. `robots.txt` carries a single `Disallow: /check/` — the earlier
draft's `Allow: /$` lines created a rule conflict that only longest-match precedence resolved, and
everything not disallowed is allowed anyway. `sitemap.xml` lists the three public paths. T031
injects `noindex, nofollow` at runtime on `/check/`.

**Hostname is now written in four places** — `brand.ts`'s arrays plus `index.html`, `robots.txt`
and `sitemap.xml`. Static files cannot import the array, so buying `grounnel.com` means editing all
four, not one. Deliberate: a build-time template for three constants is not worth the machinery.

**Known limitation of one shared build**: `document.title` per brand (T005) fixes the browser tab at
runtime, but social scrapers don't run JS — so the Biassemble domain previews with Grounnel's card.
Accepted. If it ever isn't, the fix is a per-host HTML shell via a Vercel middleware rewrite
(~an afternoon), **not** splitting into two builds. Two frontend-only Vercel projects are viable —
the Inngest objection only applied to full-stack deploys — but they cost two deploys to keep in sync
and don't solve the deeper problem.

**Not in scope**: real SEO. This is a client-rendered Vite SPA with no SSR — crawlers that don't
execute JavaScript see an empty page, and build count doesn't change that. If organic discovery ever
matters, the answer is SSR or prerendering, not two builds.

## Phase 3 — Stats

**Not a public scoreboard.** 236 production runs and 3,262 claims are almost entirely our own
testing, so volume proves nothing and a visitor who works that out trusts us less. The page is a
**dated lab snapshot**: four things, all cheap, all defensible.

- [x] T011 Generation. A trusted script with DB access writes `frontend/src/data/stats.json`;
  the aggregate is committed; the normal frontend build sees no database and no secrets.
  **Never add `DATABASE_URL` to Vercel frontend env** — `VITE_*` is public and a non-`VITE_` var
  still exposes the DB to build code. Lives in `backend/scripts/` (same Supabase DB as core, so no
  core change). Filter `source = 'production'`.
- [x] T012 Publish exactly four things, nothing else:
  1. **Window, `generatedAt`, prompt versions** — makes it a snapshot, not a live counter
  2. **Self-testing disclosure** — the JSON is production-only (T011), so the honest sentence is
     *"N production runs in window W; eval runs excluded. We also ran E internal evaluation runs in
     the same window,"* **not** "96.5% of these rows are ours". The 96.5% figure describes all rows;
     quoting it beside a production-only count is the mismatch this bullet exists to prevent.
     Production runs are still overwhelmingly our own submissions — say that in words
  3. **Verdict mix** with one sentence on why `excluded` and `unverifiable` exist — 223 of 3,262
     claims are the tool declining to judge, which is the Cardinal Rule made visible
  4. **The confirmed false accusation**, in plain language
- [x] T013 **Never publish "0 false accusations"** — one was observed 2026-09-08 in run `2a701ffa`
  (a subjective claim marked `contradicted` on evidence about a different same-named organisation).
  Report it. And do **not** publish a false-positive *rate* until T023 gives it a denominator.

  **Wording revised 2026-09-09 after external review.** The section is headed *One observed
  incorrect contradiction*, not *false accusation*. "False accusation" asserts the claim was true;
  that was never established — the claim had no clean truth value, which is why it should have been
  excluded from checking at all. What was observed is narrower and still reportable: the cited
  evidence did not establish a contradiction. T013 still holds — the incident is on the page and no
  rate is published.

**Done 2026-09-09 (T011–T013).** `backend/scripts/generate-stats.ts` writes
`frontend/src/data/stats.ts` — a **`.ts` module, not `stats.json`** as T011 said, matching
`workedExample.ts` next to it and avoiding a `resolveJsonModule` tsconfig change plus a cast.
Aggregates only: no run text, no claim text, no cost or token figures. Window is derived from the
production rows themselves (2026-08-07..2026-09-08), and eval runs are counted over the same dates
so the two are comparable: **268 production vs 3,207 eval**, 3,804 claims.

`StatsPage.tsx` publishes the four things and nothing else. One correction made during review:
abstentions (`unverifiable` + `excluded`, 318) are counted **apart from** `no_verdict` (35). A
verification that errored is not a principled abstention, and folding it in would have padded the
number the Cardinal Rule paragraph rests on.

**Deliberately not on this page**: claim/run volume counters, cost and token metrics, time-to-verdict,
retrieval rates, golden-set detection numbers, confidence distributions. Cost and tokens are
internal (publishing margins is odd, and "tokens per contradiction" rewards finding *more*
contradictions). Golden-set numbers are our own fixture with lies we planted — marking our own
homework. Confidence is pinned at 0.9 and charting it implies meaning it doesn't have.

Internal baselines are recorded in the **biassemble-core** repo, `HANDOFF-2026-09-09.md`, not here.

---

## Two live UI bugs — fix before showing anyone

Both are in `frontend/src/components/grounnel/HighlightedArticle.tsx` and both are visible on every
result today. T014 directly contradicts the philosophy T009 puts on the About page.

Fix both together — they are the same defect class (source links whose wording doesn't match the
verdict above them) in the same block. Line numbers below are **post-rebase**.

- [x] T014 **`sourcesUncited`** (line ~126) includes `'contradicted'`, and its render branch
  (line ~219) emits *"Supporting sources (no exact sentence matched):"*. Symbols are authoritative;
  line numbers are navigation only. A contradicted claim shows its refuting
  evidence labelled as supporting it. Split the wording: affirmative verdicts keep *"Supporting
  sources"*, `contradicted` gets **"Refuting sources"**.

  **Done 2026-09-09.** Fixed together with T015 by extracting the four booleans into one
  exhaustive `sourceNote(claim, sourceCount)` in `frontend/src/lib/sourceNote.ts`, so a claim
  matching no branch is now impossible rather than accidental. `contradicted` returns `refuting`.
- [x] T015 **`sourcesAreUnconfirmed` / `sourcesUncited`** (line ~120): a claim with `verdict === null` (status `pending`/`failed`) and
  `sources.length > 0` matches none of the four explanatory flags and renders bare source links, so
  a reader can't tell whether verification failed, is pending, or never evaluated the sources. Give
  it explicit wording — **"Verification incomplete — sources retrieved but not evaluated"** — rather
  than letting bare links imply the evidence backs anything. (`excluded` is fine; `notChecked`
  covers it.)

  Gate the new branch on the **state** — `verdict === null`, i.e. the claim reached no verdict —
  not on `sources.length > 0` as a proxy for it. Today those coincide; the condition should say
  what it means so it stays correct if they stop coinciding.

  **Done 2026-09-09.** `sourceNote` returns `unevaluated` for `verdict === null`, gated on the
  verdict, not the source count. Verified against production: all 35 null-verdict claims are
  `status = 'failed'`, so this is the whole real population — there is no `done` + null case.
  7 assert tests in `sourceNote.test.ts`, including one asserting no verdict falls through.

## One deploy landmine — resolved

- [x] T016 **Removed 2026-09-09, before implementation.** The untracked root `vercel.json` moved the
  backend to `/_/backend` with no `basePath`, so `/api/*` and `/api/inngest` didn't follow and the
  SPA catch-all answered them with **200 + HTML** instead of 404 — axios would have resolved and
  parsed HTML as a response, and Inngest would have registered zero functions. It was never
  committed and never deployed. `frontend/vercel.json` is unchanged and still supplies the SPA
  rewrite that `/grounnel` and the new paths depend on.

---

## Same-origin API proxy

`frontend/vercel.json` rewrites `/api/:path*` to the backend, **above** the SPA catch-all. Two
constraints that are easy to break:

- Order. Catch-all first swallows `/api/*` and answers HTML at 200 — the T016 failure again.
- **No comments in that file.** Vercel's schema sets `additionalProperties: false` on a rewrite
  entry, so a `"comment"` key fails the build outright. The rationale lives in `src/api/client.ts`.

Why it exists: the deployed backend sends no CORS headers, so the deployed site could never call it
from a browser — every request failed with `No 'Access-Control-Allow-Origin' header`. All working
runs to date came from local dev, where Vite's proxy already made `/api/*` same-origin. A CORS
allowlist was added too (`backend/src/middleware.ts`), but the proxy is what removes the
cross-origin call. Neither is an access control: the backend stays directly reachable and CORS is
enforced by browsers only, so T017's budget cap remains the real ceiling.

## Pre-launch guardrail

- [ ] T017 Google Cloud budget alert on the Gemini project + Tavily usage cap, **before DNS
  activation**. No code, ~2 minutes. Spend currently has no ceiling and one call has consumed
  808k tokens. Application-level spend breakers stay in core spec 018 — not here.

**Launch checklist**: **T014, T015, T017**, plus **T018 or T019** — the moment About/Stats appear in
the nav, a click destroys an in-flight run (~200s of work). T016 is already done and is listed here
only as history.

---

## Phase 4 — Session persistence and shareable links

Added 2026-09-09. Today `runId`, `articleText` and `sessionId` live only in React `useState` — no
`localStorage`, no `sessionStorage`, no cookie. So a refresh, a new tab, or clicking any nav link
destroys a run that took ~200s to produce. Adding About and Stats to the nav makes that worse.

- [x] T018 Persist the current run to `localStorage` (not `sessionStorage` — the ask is that a new
  tab sees the same run). Store `runId` + `articleText`; rehydrate on mount. **`runId` is internal
  and must never become the shared URL** — that is `share_token`'s job (core 019 FR-003). Two tabs share one
  slot and the newer run wins; acceptable for MVP.

  **Superseded 2026-09-09 by the URL change in T021, and reverted.** The address bar now becomes
  `/check/<share_token>` the moment a run starts, which persists a run across reloads and tabs the
  same way localStorage did — and better: it survives the tab closing and can be handed to someone
  else. Keeping BOTH was a live bug: a stored run rewrote the URL back to itself on every visit to
  `/`, so there was no way to reach a blank tool page and start a new check. `/` is a fresh tool
  again. `runStorage.ts`, its test and `ShareLink.tsx` are now unreferenced — delete them.

  **Done 2026-09-09.** `frontend/src/lib/runStorage.ts` + rehydration through
  `useGrounnelRun(initialRunId)`. Every access is wrapped — a browser that blocks storage loses
  persistence, never the run. Stored runs older than **7 days are dropped on read**, matching core's
  Redis status TTL: rehydrating past it would only ever poll a 404. 6 assert tests.
- [x] T019 ~~Nav links open About/Stats in a new tab (`target="_blank"`) until T020 lands, so an
  in-flight check survives a click. Cheap interim guard.~~

  **Dropped 2026-09-09, not implemented.** T018 landed first and solves the same problem properly:
  a nav click no longer destroys an in-flight run, because the run is restored on return. The
  launch checklist already read "T018 **or** T019", and forcing internal navigation into new tabs
  is a worse experience than the one it was guarding against.
- [x] T020 `/check/:token` page — fetch a shared assessment and render the stored text with claim
  highlights, reusing `HighlightedArticle`. This is the real fix: a URL you can return to, rather
  than browser state you can lose.

  **Done 2026-09-09 — the same page, not a second one.** `/check/:token` renders the tool's own
  layout: the disabled textarea holding the submitted text, the same progress row and dots, the same
  highlighted article and sources. No "A shared check" heading and no "still running" prose; an
  unfinished run is shown by the progress row itself, and the page polls at the same 5s interval so
  it advances rather than sitting still.

  **Reuses T014/T015.** A shared page renders the same claims, so it inherits the same wording
  defects unless those land first. Also key incomplete runs on the run's **`status`** (core 019
  FR-011), not only on `verdict === null` — different states, same UX.
- [x] T021 Surface the link when a run completes — visible, copyable, and present while the run is
  still in flight (core assigns the token at creation, so it exists before the result does).

  **Done 2026-09-09, without a panel.** The address bar IS the link: on submit the URL is
  `replaceState`d to `/check/<share_token>`. No "Link to this check" block — the browser already
  shows it. `replaceState`, not `push`, because the empty page is not somewhere to go back to.
- [x] T022 Proxy route `backend/src/app/api/grounnel/assessment/[token]/route.ts`. **Required, not
  optional**: biassemble-core is key-gated and has no CORS, so the browser cannot call it directly.
  Mirrors the existing `grounnel/status/[id]` proxy.

**Done 2026-09-09 (T020–T022).** Proxy at `backend/src/app/api/grounnel/assessment/[token]`, plus
`getSharedAssessment` on the AI client (core and dev-mock) and `sharedAssessmentSchema` in the
backend contracts. Frontend: `SharedAssessmentPage.tsx` at `/check/:token`, `ShareLink.tsx` under
the input, and `shareToken` threaded through `useGrounnelRun` and `runStorage` so a restored run
keeps its link.

Three things the shared shape forced, all from core 019 FR-009:

- **A shared claim has no id**, so the page synthesises `shared-<index>`. Fine for a frozen
  assessment; it would not be for a live one.
- **A shared claim has no citations** — core never persisted them — so a shared page shows no
  inline citation numbers and an empty References list where a live run shows both.
- **Claim status is derived from the RUN's status**, not from `verdict === null`. Reading it off
  the verdict labelled every unfinished claim "Verification failed" on a run still verifying
  (caught in review). The page also states that it does not update on its own.

`ClaimVerdict` gained `'excluded'` on the frontend, which core has emitted all along. That exposed
three verdict→style maps with no entry for it; they are now typed `Record<StyledVerdict, …>` where
`StyledVerdict = Exclude<ClaimVerdict, 'excluded'>`, so the type says what the code already did —
an excluded claim renders as ordinary text. No rendering changed.

**Depends on biassemble-core spec 019** (`share_token` + `GET /assessment/:token`) — see
the **biassemble-core** repo, `specs/019-assessment-permalink/tasks.md`. T018 and T019 are frontend-only and
can ship first.

**Note**: shared links are public, unguessable and never expire, and the documents are often
personal essays naming real people. That was the decision on 2026-09-08; 019's checklist flags that
no revocation path exists, which is worth settling before this goes live rather than after.

---

## Deliberately not in the MVP

- `/examples` — a curated list of shared links. Cheap once Phase 4 lands, but still later.
- `/docs`.
- Biassemble as an integrated analysis layer — separate link only, for now.
- Everything in **spec 018's findings**: entity-agreement gate, coverage boundaries, provenance,
  spend guardrails. Real measured problems, not MVP blockers. (Permalinks moved **out** of 018 and
  are now core spec **019**, and they are **in** scope — see Phase 4.)

## After launch

- [ ] T023 **Contradiction precision audit.** Draw 50–100 `contradicted` claims (random, excluding
  golden planted rows), label each: *evidence actually refutes the claim* / *does not* (wrong
  entity, reporting-vs-object fact, circular citation). Precision = refutes / labelled. Half a day
  of reading, not an engineering project.

  This is the unlock: it produces a real contradiction-precision figure **and** makes cost-per-false-
  positive computable — today there is exactly one confirmed FP, so any rate is a sample of one.
  Publish in the next stats snapshot. Not a launch blocker.



Spend ran ~$2/day during heavy self-testing at ~$0.036/run, so public traffic is cheap. T017 is the
ceiling; anything more is core spec 018.
