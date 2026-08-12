# Tasks: Grounnel — Frontend Fact-Check UI

**Input**: [plan.md](plan.md), [spec.md](spec.md)

**Path convention**: `frontend/src/...` only — no backend tasks. The proxy is already complete and live-verified (`plan.md` § "Backend (already complete)"); this feature is a pure consumer of `POST /api/grounnel/extract` + `GET /api/grounnel/status/:id`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other same-phase `[P]` tasks — different files, no dependency on another task in the *same* phase. A task can still be `[P]` while depending on an earlier, already-checkpointed phase's task (e.g. T006 depends on T005 from Phase 1, but is `[P]` relative to its Phase 2 siblings T007/T008).
- **[Story]**: Which user story this task belongs to (US1/US2/US3, spec.md priorities). Foundational tasks carry no Story tag, matching `001-reflection-flow/tasks.md`'s own convention.

---

## Phase 1: Foundational (Blocking Prerequisites) ✅ Done

**Purpose**: Shared data layer, matching util, and polling/state every user story depends on. Routing is deliberately NOT in this phase — see T010 (Phase 2) — it needs `GrounnelApp` to exist first, and this phase's checkpoint requires a clean build.

- [x] T001 [P] Grounnel API client functions — `frontend/src/api/client.ts`: `submitGrounnelText(text)` → `POST /api/grounnel/extract`, `getGrounnelStatus(id)` → `GET /api/grounnel/status/:id`. Untyped `response.data`, matching the file's existing convention exactly (double-quoted strings, same as the rest of the file — not reformatted to the project's prettier config, to avoid an unrelated whole-file diff).
- [x] T002 [P] Grounnel types — `frontend/src/types/grounnel.ts`: plain interfaces (`GrounnelStatusOutput`, `Claim`, `ClaimSource` as a discriminated union, `Score`), mirroring `backend/src/lib/ai/contracts.ts` field-for-field.
- [x] T003 [P] `matchClaimSpans` — `frontend/src/lib/matchClaimSpans.ts`, all 5 steps implemented (exact match → Jaccard ≥0.5 sentence fallback → null → position/id overlap tie-break with dev-only `console.warn` → runs over every claim regardless of status). **Found and fixed while implementing**: `import.meta.env.DEV` crashed outside Vite's transform (including its own tests, run via `tsx`) — changed to `import.meta.env?.DEV`. 8 plain-assert tests in the co-located `matchClaimSpans.test.ts`, run via `npx tsx src/lib/matchClaimSpans.test.ts` — all passing, covering exact/sentence-fallback/no-match/overlap/tie-break/pending-claim cases from the real observed sample. Required excluding `*.test.ts` from `tsconfig.app.json` (Node-context file, browser-only tsconfig didn't have `node` types) — see Phase 5 T017 for the fuller test suite this seeds.
- [x] T004 `usePollGrounnelStatus` — `frontend/src/hooks/usePollGrounnelStatus.ts`: 5s interval, swallow-and-retry, no fixed cutoff. **Found and fixed while implementing**: an imperative `setStatus(null)` at the top of the effect body was a real `react-hooks/set-state-in-effect` ESLint violation — replaced with a derived check (`status.id === runId ? status : null`, using the fact that `GrounnelStatusOutput.id` always equals the polled `runId`) instead of a synchronous reset.
- [x] T005 `useGrounnelRun` — `frontend/src/hooks/useGrounnelRun.ts`: owns `{ runId, status, error }` + `submit`/`dismissError`; composes `usePollGrounnelStatus` internally. Resubmission clears `runId` before the new id arrives, so the poll hook's own runId-keyed effect naturally tears down/replaces prior state (FR-013). Also derives a run-level error message from `status.status === 'failed'` (FR-012's run-level half).

**Checkpoint**: `tsc -b` clean, `eslint` clean, `vite build` succeeds, 8/8 `matchClaimSpans` tests pass (all actually run, not just written) — data layer, matching, and polling/state all exist and build clean.

---

## Phase 2: User Story 1 - Paste an article and get it fact-checked (Priority: P1) 🎯 MVP ✅ Done

**Goal**: FR-001, FR-002, FR-003, FR-006, FR-007, FR-010, FR-012 (run-level half), FR-014 — submit text, see it redisplayed with matched claim spans colored by verdict, with a real error state if the run itself fails.

- [x] T006 [P] [US1] `GrounnelApp` shell — `frontend/src/components/grounnel/GrounnelApp.tsx`: wires `useGrounnelRun`; `ArticleInput` always rendered, results rendered once `runId` exists.
- [x] T007 [P] [US1] `ArticleInput` — `frontend/src/components/grounnel/ArticleInput.tsx`: textarea + run button; rejects empty/whitespace-only text client-side (FR-002); disabled while `isRunInFlight`.
- [x] T008 [P] [US1] `HighlightedArticle` (base) — `frontend/src/components/grounnel/HighlightedArticle.tsx`: renders article text, applies `matchClaimSpans` output, colors matched spans + non-color icon per verdict (FR-007); unmatched/pending (verdict-less) claims render as plain text for now (pending styling is T013, Phase 3).
- [x] T009 [US1] Wired submit flow + run-level error state in `GrounnelApp`. **Found and fixed while implementing**: `useGrounnelRun` (Phase 1) had no way to distinguish "idle" from "initial POST in flight" — both looked like `runId: null, error: null` — so `ArticleInput` couldn't correctly disable itself during that window. Added `isRunInFlight` (`submitting || (runId set && status non-terminal)`) to `useGrounnelRun`.
- [x] T010 App routing — `frontend/src/App.tsx`: `isGrounnelRoute()` helper + branch to `<GrounnelApp />`. **Found and fixed while implementing**: the initial version called `useReflectionFlow()` after the branch's early `return` — a real Rules-of-Hooks violation, caught by ESLint (`react-hooks/rules-of-hooks`). Fixed by hoisting the hook call above the branch.

**Checkpoint**: `tsc -b`/`eslint`/`vite build` all clean. **End-to-end usability check actually run in a real browser** (Playwright + system Chrome, not simulated): started both dev servers, submitted the dev-mock's exact claim text at `/grounnel`, confirmed the article reappeared highlighted green with the ✓ icon, zero console/page errors. Required adding a dev-only Vite proxy (`vite.config.ts` `server.proxy`) — local dev had no way to run FE+BE together at all before this (a real, pre-existing gap unrelated to Grounnel: no CORS config anywhere in this backend, no existing proxy; production works via a mechanism outside this repo's visibility that wasn't fully resolved during investigation). The proxy is dev-only and does not affect production builds.

---

## Phase 3: User Story 2 - Watch the check happen, not just wait for it (Priority: P1) ✅ Done

**Goal**: FR-004, FR-005, FR-011, FR-012 (claim-level half) — live checked/total feedback, distinct pending/failed treatment.

**Independent Test**: Submit a multi-claim article, observe checked/total counts advance across polls with a distinct running state for unchecked claims, until a terminal state.

- [x] T011 [P] [US2] `GrounnelProgress` — `frontend/src/components/grounnel/GrounnelProgress.tsx`: indeterminate "Finding claims…" (with a `loading-dots` spinner) when `status` is `null`; numeric `checked / total` once it arrives, pulsing (`animate-pulse` + spinner) while non-terminal, static once `done`/`failed` (FR-005); `caps_hit` partial-results note (FR-011); soft "taking longer than usual" note once `elapsed_seconds` passes 60s while non-terminal, per plan.md's threshold (depends on T002, T004).
- [x] T012 [US2] Wired `GrounnelProgress` into `GrounnelApp`, between `ArticleInput` and the `HighlightedArticle` card, gated on `runId` like the article card (depends on T006, T011).
- [x] T013 [US2] Pending/failed claim styling in `HighlightedArticle` — `status: pending` → subtle gray pulse (`bg-base-300/50 animate-pulse`) + spinner icon in place of the usual verdict glyph; `status: failed` → dashed outline + warning-triangle icon, distinct from `unverifiable` (FR-012 claim-level half). Verdict-vs-status precedence: a claim's `verdict` (once present) always wins over its `status` for styling. **Found and fixed while implementing**: the failed-claim style set only a border and text color, no explicit background — the browser's UA-default `mark { background: yellow }` bled through underneath the dashed border. Fixed by adding an explicit `bg-base-100` (depends on T008 — same file, must land before T014).

**Checkpoint**: `tsc -b`/`eslint`/`vite build` all clean. **End-to-end verified in a real browser** (Playwright + system Chrome): the dev-mock's real single-claim `done` flow re-verified with no regression (green ✓ highlight, zero console errors). Since the dev-mock only ever returns an immediate `done` status (fixed fixture, no pending/failed/caps_hit/stalled states to exercise), the three new states plus `caps_hit` and the 60s-stalled note were verified by intercepting `/api/grounnel/status/:id` at the network layer (Playwright `page.route`, synthetic 3-claim response) and confirming real DOM output: `1 / 3 claims checked` with pulse+spinner, the partial-results note, the stalled note, and all three claim renderings (green/pulse-gray/dashed-warning) — screenshot-confirmed, zero console/page errors both before and after the background-bleed fix.

---

## Phase 4: User Story 3 - Follow a highlighted claim to its evidence (Priority: P2) ✅ Done

**Goal**: FR-008, FR-009 — sources reachable from both the highlighted span and a dedicated list.

**Independent Test**: Submit an article, let ≥1 claim resolve with sources, confirm those sources are reachable from the span's tooltip and listed below the article.

- [x] T014 [US3] Tooltip on highlighted spans — `HighlightedArticle.tsx`: `<mark>` gets `tabIndex={0}` + `group relative` only when `claim.sources.length > 0`; a `group-hover`/`group-focus-within`-driven panel (real `<a>` links via the new shared `SourceLink`) appears below the span — zero-source claims get no `tabIndex`, no panel, keep only their verdict color/icon (FR-008, spec.md's zero-source edge case). Keyboard-reachable (the `<mark>` itself is the focus target, so `focus-within` fires without needing to tab past it first) (depends on T013).
- [x] T015 [P] [US3] `ClaimSourceList` — `frontend/src/components/grounnel/ClaimSourceList.tsx`: per-claim source links (≤2 shown) via the same shared `SourceLink`; ordered by `matchClaimSpans`' resolved start position (matched-first, unmatched claims appended at the end in `claims[]` order); explicit "No sources found" state for zero-source claims (depends on T002, T003).
- [x] T016 [US3] Wired `ClaimSourceList` into `GrounnelApp`, below the `HighlightedArticle` card (depends on T006, T015).
- New: `frontend/src/components/grounnel/SourceLink.tsx` — small shared presentational component (not in the original task list) factored out once T014 and T015 both needed identical source-rendering logic: `kind: 'web'` → real link (`target="_blank" rel="noopener noreferrer"`), `kind: 'attached'` → plain text (no URL exists for attached sources in this phase, per backend contract — rendering it as a link would be a broken one).

**Checkpoint**: `tsc -b`/`eslint`/`vite build` all clean. **End-to-end verified in a real browser** (Playwright + system Chrome, `page.route` synthetic 2-claim/2-source response): confirmed real `<a>` elements in the source list with correct `href`/`target`/`rel`; confirmed the tooltip's links become visible on `hover()` (not just present in the DOM); confirmed the zero-source claim's `<mark>` has no `tabindex` (no tooltip trigger) and the source list shows "No sources found" for it — screenshot-confirmed, zero console/page errors.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T017 [P] `matchClaimSpans` tests — `frontend/src/lib/matchClaimSpans.test.ts`, run via `tsx` (no new dependency, plan.md § Testing): cases drawn from the real observed sample (appositive removal, appositive-promoted-to-sentence, pronoun resolution, elliptical-subject resolution, participial-appositive-to-finite-clause), plus overlap tie-break (position, then `claim.id`, with the `console.warn` collision log asserted) and no-match-clears-threshold cases, plus duplicate-content cases: an article with two identical sentences (which one does a single claim match?), two claims with identical/near-identical text (do both match, or does the overlap tie-break correctly apply?), and a claim whose text is a duplicate substring appearing twice in the article (depends on T003)
- [ ] T018 [P] Resubmission edge case — manually verify `useGrounnelRun` teardown/replace behavior (FR-013): submit, submit again mid-poll, confirm no result mixing between runs (depends on T009)
- [ ] T019 Manual `dev-mock` smoke test — full flow submit → poll → `done`, against `AI_CLIENT_MODE=dev-mock` (plan.md § Testing) (depends on Phase 2–4 complete)
- [ ] T020 [P] Manual `core`-mode smoke test — `AI_CLIENT_MODE=core` through this repo's own proxy (not bypassed), confirming the frontend renders a real multi-claim run correctly end-to-end (depends on Phase 2–4 complete)
- [ ] T021 Mobile responsiveness pass — `frontend/src/components/grounnel/{GrounnelApp,ArticleInput,GrounnelProgress,HighlightedArticle,ClaimSourceList}.tsx` at 375px/768px/1024px, including tooltip → tap conversion for `HighlightedArticle`'s source tooltip (T014); same bar as the existing reflection product's `frontend/src/components/` (spec.md § Assumptions) (depends on Phase 2–4 complete)

---

## Dependencies & Execution Order

- **Phase 1 (Foundational)** blocks every user story — nothing in Phase 2–4 should start first. Routing (T010) is intentionally in Phase 2, not here — see T010's own note.
- **Phase 2 (US1), Phase 3 (US2), Phase 4 (US3)** can proceed in parallel once Phase 1 is done, **except**: `HighlightedArticle.tsx` is touched by all three (T008 creates it, T013 adds pending/failed styling, T014 adds tooltips) — real file-level coupling, not independent despite the story labels. This is enforced task-by-task, not just in this prose: T013 depends on T008, and T014 depends on T013 directly.
- **Phase 5 (Polish)** depends on Phases 2–4 being complete.

## Notes

- No backend tasks in this file — see plan.md's own "Backend (already complete)" table; the one pre-existing gap noted there (`core`-mode path through this repo's proxy) is closed by T020, not a blocker for T001–T019.
- Task numbering restarts at T001 for this feature directory (self-contained, not a continuation of `specs/001-reflection-flow/tasks.md`'s numbering).
