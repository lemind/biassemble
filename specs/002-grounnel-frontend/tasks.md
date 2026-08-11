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

## Phase 2: User Story 1 - Paste an article and get it fact-checked (Priority: P1) 🎯 MVP

**Goal**: FR-001, FR-002, FR-003, FR-006, FR-007, FR-010, FR-012 (run-level half), FR-014 — submit text, see it redisplayed with matched claim spans colored by verdict, with a real error state if the run itself fails.

**Independent Test**: Paste a sample with ≥1 checkable claim, submit, confirm the article reappears below the textarea with ≥1 span highlighted and colored per its verdict.

- [ ] T006 [P] [US1] `GrounnelApp` shell — `frontend/src/components/grounnel/GrounnelApp.tsx`: wires `useGrounnelRun` + `usePollGrounnelStatus`; `ArticleInput` always rendered, results rendered once a run exists (depends on T005)
- [ ] T007 [P] [US1] `ArticleInput` — `frontend/src/components/grounnel/ArticleInput.tsx`: textarea + run button; rejects empty/whitespace-only text client-side before any request (FR-002); disabled while a run is in flight
- [ ] T008 [P] [US1] `HighlightedArticle` (base) — `frontend/src/components/grounnel/HighlightedArticle.tsx`: renders article text, applies `matchClaimSpans` output, colors matched spans + attaches the matching non-color icon per the verdict table (plan.md § Verdict → color mapping, FR-007); unmatched claims render no span (depends on T002, T003 — a standalone presentational component that doesn't need `GrounnelApp` to exist yet, same creation/wiring split as T015/`ClaimSourceList`)
- [ ] T009 [US1] Wire submit flow + run-level error state in `GrounnelApp` — submit → run id → poll → pass status into `HighlightedArticle`; render `useGrounnelRun`'s `error` (including overall `status: failed`) as a dismissible inline error state that lets the user submit new text (FR-012 run-level half, spec.md's "run status becomes failed" edge case) (depends on T006, T007, T008)
- [ ] T010 App routing — `frontend/src/App.tsx`: `isGrounnelRoute()` helper wrapping `window.location.pathname === '/grounnel'`, branching to `<GrounnelApp />` before existing phase logic (ADR-002 §3, FR-014) (depends on T006 — deliberately not in Phase 1: `GrounnelApp.tsx` doesn't exist until this phase, and Phase 1's checkpoint requires a clean build)

**Checkpoint**: US1 independently functional — paste text, see verdict-colored highlights, see a real error state on run failure.

---

## Phase 3: User Story 2 - Watch the check happen, not just wait for it (Priority: P1)

**Goal**: FR-004, FR-005, FR-011, FR-012 (claim-level half) — live checked/total feedback, distinct pending/failed treatment.

**Independent Test**: Submit a multi-claim article, observe checked/total counts advance across polls with a distinct running state for unchecked claims, until a terminal state.

- [ ] T011 [P] [US2] `GrounnelProgress` — `frontend/src/components/grounnel/GrounnelProgress.tsx`: checked/total display; indeterminate "Finding claims…" state before the first status poll returns (no numeric `0 / 0`); counter pulses while `status` is non-terminal, static once `done`/`failed` (FR-005); `caps_hit` partial-results note (FR-011); soft "taking longer than usual" note past 60s elapsed with a non-terminal status, using `started_at`/`elapsed_seconds` (depends on T002, T004)
- [ ] T012 [US2] Wire `GrounnelProgress` into `GrounnelApp`, positioned between the textarea and the article body per spec.md (depends on T006, T011)
- [ ] T013 [US2] Pending/failed claim styling in `HighlightedArticle` — `status: pending` → plain gray pulse + spinner icon; `status: failed` → muted gray dashed outline + warning-triangle icon, distinct from `unverifiable` (FR-012 claim-level half) (depends on T008 — same file, must land before T014)

**Checkpoint**: US1 + US2 — progress visible live; pending/failed claims read distinctly from verdicts.

---

## Phase 4: User Story 3 - Follow a highlighted claim to its evidence (Priority: P2)

**Goal**: FR-008, FR-009 — sources reachable from both the highlighted span and a dedicated list.

**Independent Test**: Submit an article, let ≥1 claim resolve with sources, confirm those sources are reachable from the span's tooltip and listed below the article.

- [ ] T014 [US3] Tooltip on highlighted spans — `HighlightedArticle.tsx`: hover/focus affordance linking to ≥1 source per matched claim, rendered ONLY when `claim.sources.length > 0` — a zero-source claim keeps its verdict color/icon but gets no tooltip at all, never an empty one (FR-008, spec.md's zero-source edge case) (depends on T013 — same file, lands after pending/failed styling per Phase 3's ordering)
- [ ] T015 [P] [US3] `ClaimSourceList` — `frontend/src/components/grounnel/ClaimSourceList.tsx`: per-claim source links (≤2 shown), grouped by claim (never globally deduped across claims); ordered by each claim's matched span position in the article (matched-first, unmatched claims appended at the end in `claims[]` order) — not array order or completion order (plan.md § Component structure); explicit "no sources found" state for zero-source claims, never a broken link (depends on T002, T003 — needs `matchClaimSpans`' resolved positions to order by)
- [ ] T016 [US3] Wire `ClaimSourceList` into `GrounnelApp`, below `HighlightedArticle` (depends on T006, T015)

**Checkpoint**: All three user stories independently functional.

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
