# Feature Specification: Grounnel — Frontend Fact-Check UI

**Feature Directory**: `specs/002-grounnel-frontend`

**Branch**: `grounnel`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Paste an article into a textarea and run it. During processing the backend returns the current state we have as results: (1) the article text below the textarea with supported claims highlighted green with a tooltip linking to sources, contradicted highlighted red, other verdicts in their own colors, only claim spans highlighted, rest of the text plain; (2) a progress bar between the textarea and the text showing how many claims total and how many checked, with a running spinner state during checking; (3) a list of source links found per claim below the text, two links per claim is fine; route is `/grounnel`."

## User Scenarios & Testing

### User Story 1 - Paste an article and get it fact-checked (Priority: P1)

A user pastes an arbitrary block of text (a news article, a claim-heavy post) into a textarea at `/grounnel` and submits it. Within the pipeline's normal running time, they see the article reprinted below the textarea with its checkable factual claims highlighted according to whether each one turned out to be supported, contradicted, or something in between — without leaving the page or losing their place.

**Why this priority**: This is Grounnel's entire value proposition — a paste-and-check tool that isn't useful until a user can go from raw text to a fact-checked, readable result. Nothing else in this spec matters without it.

**Independent Test**: Can be fully tested by pasting a text sample containing at least one checkable factual claim, submitting it, and confirming the article reappears below the textarea with at least one claim visually highlighted and colored according to its verdict.

**Acceptance Scenarios**:

1. **Given** a user is on `/grounnel` with an empty textarea, **When** they paste article text and click the run button, **Then** the system accepts the submission and begins showing progress without a page reload.
2. **Given** a submitted run has at least one claim with a final verdict, **When** the frontend polls status, **Then** the article text is redisplayed with that claim's matched span colored per its verdict (green for `supported`, red for `contradicted`, distinct colors for `partially_supported`/`unsupported`/`unverifiable`) and the rest of the text unstyled.
3. **Given** a claim's verdict is `supported` or `contradicted`, **When** a user hovers/focuses its highlighted span, **Then** a tooltip surfaces a link to at least one of that claim's sources.
4. **Given** a user submits text with no checkable factual claims, **When** the run completes, **Then** the article is redisplayed with nothing highlighted and no error is shown.

---

### User Story 2 - Watch the check happen, not just wait for it (Priority: P1)

While a submitted run is being processed, a user wants to see it actually progressing — how many claims were found in total, how many have been checked so far, and that the ones still outstanding are actively being worked, not stalled.

**Why this priority**: Grounnel's own pipeline literature (`biassemble-core/specs/009-grounnel/initial-context.md`) describes runs that stream results claim-by-claim over real time (extraction is near-instant; verification is the slow part) — a blank wait with no feedback for that whole span reads as broken, not slow, and directly undermines User Story 1's core promise of a live result.

**Independent Test**: Can be tested by submitting a multi-claim article and observing the progress indicator's checked/total counts increase over successive polls, with a visibly distinct running state for claims not yet checked, until the run reaches a terminal state.

**Acceptance Scenarios**:

1. **Given** a run has just been submitted, **When** the first status poll returns, **Then** a progress indicator appears between the textarea and the article text showing `0 / total` (or the current checked count) claims checked.
2. **Given** a run is still `extracting` or `verifying`, **When** claims remain unchecked, **Then** those claims show a distinct running/spinner state, both in the progress indicator and (once matched) in the article text.
3. **Given** a run reaches `status: done` or `status: failed`, **When** the frontend polls that final state, **Then** the progress indicator stops advancing and reflects the run's final checked/total counts.

---

### User Story 3 - Follow a highlighted claim to its evidence (Priority: P2)

A user sees a claim highlighted in the article and wants to know what evidence produced that verdict — not just trust the color, but check the source.

**Why this priority**: A color alone is an unverifiable assertion; Grounnel's whole premise is grounding claims in the open web, so the sources are the actual product, not a nice-to-have appendix.

**Independent Test**: Can be tested by submitting an article, letting at least one claim resolve with sources, and confirming those sources are both reachable from the highlighted span's tooltip and listed in a dedicated list below the article text.

**Acceptance Scenarios**:

1. **Given** a claim has one or more sources, **When** the run's results are displayed, **Then** those sources (up to a small number per claim, e.g. 2) appear as links in a source list below the article text.
2. **Given** a claim has zero sources (e.g. `unsupported`, or `unverifiable` with none), **When** the source list is displayed, **Then** that claim is either omitted from the list or shown with an explicit "no sources found" state — never a broken/empty link.
3. **Given** two different claims cite the same URL, **When** the source list is displayed, **Then** each claim's own source entry is shown under that claim, without needing global deduplication logic that could hide which claim a source actually supports.

### Edge Cases

- What happens when a claim's extracted text can't be confidently located inside the pasted article (paraphrase, resolved pronoun, near-original but not verbatim wording)? — That claim is not highlighted in the article body, but still appears in the source list, so no verdict is silently lost.
- What happens when two claims' matched spans overlap (compound sentence split into multiple atomic claims by the extraction step)? — Only one span is highlighted at that location; the other claim still appears in the source list below.
- What happens when `caps_hit` is `true` (the pipeline capped the number of claims it checked)? — The UI indicates the results are partial, not silently presenting a capped run as complete.
- What happens when a claim's own `status` is `failed` (verification itself errored, not a verdict)? — Shown distinctly from the five real verdicts, not folded into `unverifiable`.
- What happens when the run's overall `status` becomes `failed`? — The UI shows an error state and lets the user submit new text; it does not get stuck polling forever.
- What happens when a run never reaches `done`/`failed` at all (e.g. an upstream issue stalls it without ever producing a clean failure state)? — Polling continues (no hard cutoff, since run length is inherently variable), but after a fixed elapsed time the UI shows a soft "this is taking longer than usual" note using the run's own `elapsed_seconds`, so a stalled run never presents identically to a healthy in-progress one.
- What happens when a status poll fails transiently (network blip)? — Polling continues on the next interval rather than surfacing an error immediately.
- What happens when a user submits new text while a previous run is still polling? — The previous run's polling stops and the view resets to the new run's progress; results never mix between two runs.
- What happens when the submitted text has zero checkable claims? — Run completes normally with an empty claims list; article shown unhighlighted, no error.
- What happens when a user submits empty/whitespace-only text? — Rejected client-side before a request is sent, same bar as the backend's own `text.min(1)` validation.

## Requirements

### Functional Requirements

- **FR-001**: Users MUST be able to paste free-form text into a textarea at `/grounnel` and submit it to start a fact-check run.
- **FR-002**: System MUST reject empty/whitespace-only submissions before making a network request.
- **FR-003**: System MUST poll for the run's current state after submission and update the displayed results as new state arrives, without a page reload.
- **FR-004**: System MUST display a progress indicator, positioned between the textarea and the article text, showing claims checked vs. total claims found.
- **FR-005**: System MUST show a distinct running/in-progress state for claims that are not yet checked, both in the progress indicator and in the article body once a span is matched.
- **FR-006**: System MUST redisplay the submitted article text below the textarea, with only the spans matched to a claim visually highlighted — all other text MUST remain unstyled.
- **FR-007**: System MUST color each highlighted span according to its claim's verdict: `supported` = green, `contradicted` = red; `partially_supported`, `unsupported`, and `unverifiable` MUST each have their own visually distinguishable color, none of which is confusable with green or red.
- **FR-008**: System MUST show a tooltip (or equivalent hover/focus affordance) on each highlighted span that links to at least one of that claim's sources.
- **FR-009**: System MUST display a list of source links per claim below the article text, showing up to a small fixed number of sources per claim (2 is sufficient).
- **FR-010**: System MUST NOT highlight a claim in the article body when its text cannot be confidently located there, while still surfacing that claim's verdict/sources in the source list.
- **FR-011**: System MUST indicate when a run's results are partial because the pipeline capped claim checking (`caps_hit`).
- **FR-012**: System MUST distinguish a claim-level verification failure (`status: failed`) from the five defined verdicts, and distinguish a run-level failure (`status: failed`) from a run still in progress.
- **FR-013**: System MUST allow a user to submit a new run at any time, canceling in-flight polling for any previous run and resetting the displayed results to the new run's state only.
- **FR-014**: System MUST be reachable at a dedicated, bookmarkable `/grounnel` URL, independent of the existing reflection product's flow.
- **FR-015**: The frontend MUST NOT hold or transmit any AI-provider credential, and MUST NOT make requests directly to any third-party AI service — all AI-backed processing happens through this product's own backend (implementation: `biassemble/backend`'s existing Grounnel proxy routes, see plan.md).

### Key Entities

- **GrounnelRun**: One fact-check submission. Attributes: id, overall status (`extracting` / `verifying` / `done` / `failed`), progress (checked/total claims), score (aggregate grounded/unclear/contradicted counts), whether claim-checking was capped, timestamps.
- **Claim**: One atomic, checkable factual statement extracted from the submitted text. Attributes: id, extracted text (near-original wording, not guaranteed verbatim), per-claim status (`pending` / `done` / `failed`), verdict (`supported` / `partially_supported` / `unsupported` / `contradicted` / `unverifiable`, or none yet), evidence passage, confidence, a one-line reason, and its sources.
- **ClaimSource**: Evidence backing a claim's verdict — either a web source (title, domain, URL, reachability status) or an attached-document source (not produced in this phase, per backend contract).

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can go from pasting text to seeing the first highlighted claim result without a page reload or navigation away from `/grounnel`.
- **SC-002**: Every claim that reaches a terminal verdict is represented somewhere in the UI — either as a highlighted span, or (when unmatched) in the source list — none are silently dropped.
- **SC-003**: Progress feedback (checked/total, running state) is visible within one polling interval of submission, so a multi-minute run never presents as a blank/frozen page.
- **SC-004**: Verdict colors are distinguishable from each other at a glance — 5 distinct colors for the 5 verdicts, plus separate, mutually distinguishable neutral treatments for a claim still being checked (`pending`) and a claim whose verification itself errored (`status: failed`), per FR-012.
- **SC-005**: A user can reach a claim's underlying source from either the highlighted span's tooltip or the source list below the text, for every claim that has at least one source.

## Assumptions

- The backend proxy described in ADR-001/ADR-003 (`POST /api/grounnel/extract`, `GET /api/grounnel/status/:id`) is already built, deployed-shape-correct, and is the only integration surface this feature calls — confirmed against current code as of 2026-08-11 (`backend/src/services/grounnel.service.ts`, `backend/src/app/api/grounnel/**`, `backend/src/lib/ai/contracts.ts`).
- `biassemble-core` does not return character offsets for a claim's location within the submitted text. Confirmed live against the real deployed API (2026-08-11, direct `POST /extract` + `GET /status/:id` call against `https://biassemble-core.vercel.app`, a 5-sentence/14-claim test article): only **4 of 14** returned claims were exact verbatim substrings of the submitted text — the other 10 had an appositive clause removed or promoted into its own sentence, an elliptical construction resolved, or a pronoun resolved to its referent. This is not a rare edge case, it is the majority case. Highlighting therefore requires best-effort text matching on the frontend, not a direct offset lookup or exact-substring search — see plan.md for the matching approach.
- No authentication/user accounts are in scope; a Grounnel run is anonymous, matching the reflection product's existing session model (ADR-003).
- No new frontend dependencies are added for this feature (routing, matching, and rendering are built on the existing Vite/React stack) unless a specific gap is raised with the user first.
- Mobile responsiveness follows the same bar as the existing reflection product's frontend; no new device-specific requirements are introduced here.
