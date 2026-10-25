# Feature Specification: Grounnel — Public Site (MVP)

**Feature Branch**: `phase-5_grn-mvp`

**Created**: 2026-09-09

**Status**: Draft

**Input**: Grounnel becomes the main product and the public face of the work, on its own domain with
its own brand, plus an About page and a Stats page. Biassemble is a **separate related project**
that keeps its existing URL unchanged and is reached by a link — not a parent, and not an integrated
feature. The pipeline ships as-is.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A stranger understands and uses Grounnel in under a minute (Priority: P1)

Someone arrives at the Grounnel domain knowing nothing. They see a one-line statement of what it
does and a box to paste text into. They paste an article and get per-claim verdicts with sources,
without having read anything else first.

**Why this priority**: This is the product. Everything else on the site exists to support or explain
it. "Biassemble — AI reasoning platform for detecting cognitive biases" does not tell a stranger
what the tool does; "verify the claims in any text" does.

**Independent Test**: Open the Grounnel domain in a clean browser, paste an article, get results.
Delivers the whole value on its own — About and Stats can ship later.

**Acceptance Scenarios**:

1. **Given** a first-time visitor on the Grounnel domain, **When** the page loads, **Then** they see
   the Grounnel name, logo, and a one-line description, with the text input visible without
   scrolling.
2. **Given** a visitor with an article, **When** they submit it, **Then** the existing check runs
   unchanged and returns per-claim verdicts with sources.
3. **Given** a visitor on any Grounnel page, **When** they look at the navigation, **Then** they can
   reach the app, About and Stats.

---

### User Story 2 - Existing Biassemble users are unaffected (Priority: P1)

Anyone using the current Biassemble URL — including anyone holding a `/grounnel` link — sees no
change at all.

**Why this priority**: P1 because it is a regression risk, not a feature. Links have been shared
during testing and the reflection flow is live. Breaking them costs more than the new site gains.

**Independent Test**: Visit the existing URL and every known deep link before and after; behaviour
is identical.

**Acceptance Scenarios**:

1. **Given** the existing Biassemble URL, **When** it is opened, **Then** the reflection flow loads
   exactly as before, with Biassemble branding.
2. **Given** an existing `/grounnel` link on the Biassemble host, **When** it is opened directly or
   hard-refreshed, **Then** the Grounnel app loads rather than a 404.
3. **Given** either host, **When** a visitor navigates between products, **Then** the cross-links
   work in both directions.

---

### User Story 3 - A skeptic reads About and understands the method (Priority: P2)

Someone deciding whether to trust the tool reads one page and comes away understanding what it does,
how it works, and what it deliberately refuses to do.

**Why this priority**: The product makes assertions about other people's writing. Explaining the
method is what separates it from a black box, and the design philosophy is a genuine differentiator
most automated fact-checkers leave unstated.

**Independent Test**: A reader unfamiliar with the project reads `/about` and can describe the
pipeline and the false-accusation stance in their own words.

**Acceptance Scenarios**:

1. **Given** a reader on `/about`, **When** they read the page, **Then** they can state what
   Grounnel takes as input and what it returns.
2. **Given** the same reader, **When** they reach the philosophy section, **Then** it states plainly
   that a false accusation is worse than a missed detection, and that weak evidence produces "not
   verified" rather than a confident refutation.
3. **Given** a reader curious about the project's origin, **When** they finish the page, **Then**
   Biassemble is identified as a separate related project, not as a parent.

---

### User Story 4 - A skeptic checks the numbers (Priority: P2)

Someone who wants evidence rather than claims opens Stats and finds figures that state what they
count, over what period, and by what definition — including known failures.

**Why this priority**: The measurement genuinely exists, which is unusual and worth showing. But a
number without a denominator is worse than no number, and the audience for this page is precisely
the audience that will check.

**Independent Test**: Every figure on the page can be traced to a stated denominator, window and
definition without asking the author.

**Acceptance Scenarios**:

1. **Given** any published figure, **When** a reader looks at it, **Then** its denominator,
   measurement window and definition are stated alongside it.
2. **Given** any published figure, **When** it is shown, **Then** the proportion of rows produced by
   internal testing is disclosed alongside it.
3. **Given** a known failure has occurred, **When** the page reports reliability, **Then** the
   observed failure is reported rather than omitted.

---

### User Story 5 - Someone discovers the related project (Priority: P3)

A visitor interested in the wider work finds Biassemble in one click, presented as a separate tool
they may also want — not as a parent organisation they have to understand first.

**Why this priority**: Keeps the older project reachable without making a stranger learn its
harder-to-explain concept before using Grounnel. Grounnel is the umbrella; Biassemble is a sibling.

**Independent Test**: The link exists, is reachable from any Grounnel page, and reads as "another
thing you can use" rather than attribution.

**Acceptance Scenarios**:

1. **Given** a visitor on any Grounnel page, **When** they look at the footer, **Then** a single link
   presents Biassemble as a related project with a one-line description of what it does.
2. **Given** that link, **When** it is followed, **Then** the existing Biassemble site loads
   unchanged at its own URL.

---

### User Story 6 - A visitor checks with their own key (Priority: P2)

A visitor who already has an account with a model provider can run the check on that account.
Without a key, the check is unchanged and runs on Gemini. The page names the provider that ran it.

**Why this priority**: The default check must stay the same for everyone who does not bring a key.
The own-key path is how a visitor pays for a different provider without Grounnel spending its own
account.

**Independent Test**: Submit once with no key and once with a key for each offered provider. The
no-key result names Gemini. Each own-key result names the provider that was chosen. The share page
names the same provider and does not ask for a key.

**Acceptance Scenarios**:

1. **Given** a visitor who has not chosen to use their own key, **When** they submit text, **Then**
   the check runs as before and the result says it was checked with Gemini.
2. **Given** a visitor who turns on their own key, **When** the form is shown, **Then** they can
   choose Gemini, DeepSeek, or Qwen, and they cannot choose a check that Grounnel pays for on
   another provider.
3. **Given** that choice, **When** they have not yet submitted, **Then** the page states which
   company processes the model calls, that Grounnel uses the key for this check and does not save
   it, that web search still runs on Grounnel's account, and that anyone with the share link can
   open the result.
4. **Given** the own-key choice with an empty key, **When** they submit, **Then** the check does
   not start.
5. **Given** a key the provider rejects, **When** the check is refused, **Then** the visitor sees
   an authentication error.
6. **Given** a finished check, **When** the visitor or someone with the share link opens the
   result, **Then** the page names Gemini, DeepSeek, or Qwen. A missing or unknown provider is
   shown as Gemini and the raw value is not repeated. The share page does not offer a key field.

---

### Edge Cases

- A visitor arrives on a host that is neither known domain (a preview deployment, `localhost`, or a
  misconfigured DNS record). The site must render something coherent rather than half-branded — and
  the fallback must not silently disguise a domain misconfiguration in production.
- A visitor hard-refreshes or deep-links directly to `/about` or `/stats` rather than navigating
  from the root.
- The Stats source has no production runs in the chosen window, or the known-failure count changes.
- A claim's verdict is unavailable (verification failed or still pending) while sources were already
  retrieved — the interface must not imply those sources support anything.
- A refuted claim's sources must not be described in language implying they support the claim.
- A visitor turns on their own key and submits without pasting one. The check does not start.
- A provider rejects the visitor's key. The message is an authentication error, and the check does
  not fall back to Grounnel's account.
- A stored result names a provider the page does not recognise. The page says Gemini and does not
  echo the unrecognised value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Grounnel domain MUST present Grounnel's own name, logo and description, and MUST
  open directly onto the claim-checking tool.
- **FR-002**: The existing Biassemble host MUST continue to serve the reflection flow at its root and
  the Grounnel app at its existing path, with unchanged behaviour.
- **FR-003**: Visitors MUST be able to reach the tool, About and Stats from any page.
- **FR-004**: Every site path MUST resolve on direct navigation and hard refresh, not only via
  in-app navigation.
- **FR-005**: Branding MUST be determined by which domain the visitor arrived on, independently of
  which page they are viewing.
- **FR-006**: An unrecognised host MUST render a complete, coherent site rather than a partial one,
  and MUST record that the host was unrecognised. A misconfigured production domain therefore looks
  like a working Biassemble site — accepted, because T001's six-case host x path check catches it
  before launch. No user-visible indicator.
- **FR-007**: About MUST describe the input, the processing sequence, and the output in terms a
  non-technical reader can follow.
- **FR-008**: About MUST state the false-accusation-over-missed-detection principle explicitly.
- **FR-009**: Every figure published on Stats MUST carry its denominator, measurement window and
  definition.
- **FR-010**: Published figures MUST disclose what proportion of the underlying activity is internal
  testing rather than external use.
- **FR-011**: Stats MUST NOT publish a reliability figure that contradicts an observed failure. Where
  a failure has been observed it is reported, or the metric is omitted.
- **FR-012**: Source links shown for a claim MUST be described in language consistent with that
  claim's verdict.
- **FR-013**: A claim with no verdict MUST be visibly distinguished from one that was checked, and
  its retrieved sources MUST NOT be presented as evidence.
- **FR-017**: A link to the site shared in a chat or social application MUST render a preview with a
  title, description and image rather than a bare URL.
- **FR-019**: Site-level metadata — title, description, preview image, canonical address — MUST
  present Grounnel, since Grounnel is the public product. The legacy domain inherits it.
- **FR-018**: Shared assessment pages MUST NOT be indexed by search engines.
- **FR-015**: The landing page MUST show one real check end to end — submitted text, extracted
  claims, and at least one verdict with its supporting passage and source.
- **FR-016**: A false-positive *rate* MUST NOT be published until it has a labelled denominator.
- **FR-014**: Grounnel MUST link to Biassemble as a separate related project, describing what it
  does, without implying Biassemble is a parent or that Grounnel is a component of it.
- **FR-020**: A check with no visitor key MUST run on Gemini, and the result and the share page
  MUST name the provider that ran the check. A missing or unknown provider MUST be shown as Gemini.
- **FR-021**: A visitor MAY supply their own key and choose Gemini, DeepSeek, or Qwen for that
  check. The site MUST NOT offer a control that spends Grounnel's account on another provider. The
  key MUST be used for that check only and MUST NOT be saved. Before the first such check the page
  MUST say which company processes the model calls, that the key is not saved, that web search
  still uses Grounnel's account, and that the share link is public. An empty key MUST NOT start a
  check. A rejected key MUST be reported as an authentication error. The notice also says that,
  after the check, this page shows how many input and output tokens were charged to the key.
- **FR-022**: After an own-key check finishes, the result page and the share page MUST show the
  approximate input and output tokens charged to that key. A site-paid check, and a check that is
  still running, MUST show no token line. Web-search tokens MUST NOT be included. The key itself
  MUST NOT be shown. The counts on the share link are public.

### Key Entities

- **Brand**: an identity tied to a domain — name, logo, tagline, navigation. Independent of page.
- **Page**: one of the tool, About, or Stats. Determined by path, not brand.
- **Published statistic**: a value plus its denominator, window and definition. Never a bare number.
- **Claim presentation**: a verdict, its sources, and the wording that describes their relationship.
- **Own-key choice**: optional, off unless the visitor turns it on. A provider plus a key used for
  that check only. Absent on a shared result.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can submit text for checking without reading any other page.
- **SC-002**: Every previously working Biassemble and `/grounnel` link still works after launch —
  zero broken links.
- **SC-003**: Every site path returns the site on hard refresh — zero 404s on direct navigation.
- **SC-004**: A reader unfamiliar with the project can describe the pipeline and the
  false-accusation principle after reading About once.
- **SC-005**: 100% of published figures state denominator, window and definition.
- **SC-006**: No published figure can be contradicted by the project's own records.
- **SC-008**: A first-time visitor can see a complete worked example without submitting anything.
- **SC-009**: A link pasted into a chat application renders a preview card, not a bare URL.
- **SC-007**: No claim displays source links whose wording conflicts with its verdict.
- **SC-010**: A check with no visitor key names Gemini on the result. A check with a visitor key
  names the provider the visitor chose, on the result and on the share page.

## Assumptions

- A domain for Grounnel is acquired separately; obtaining it is an input to this work, not part of it.
- The checking pipeline ships unchanged — no modification to extraction, verification, or gates.
  Choosing the judge is the exception in Phase 10: the default check stays on Gemini, and another
  provider runs only when the visitor brings a key (core spec 020).
- Both sites are served by a single frontend deployment; the frontend and the backend remain
  separate deployments and remain cross-origin, exactly as today.
- Statistics are drawn from existing telemetry; no new measurement is introduced.
- API documentation is out of scope for this release.
- Sharing individual assessments by link **is in scope** (see the tasks' Phase 4) and depends on
  biassemble-core spec 019. An earlier draft listed it as out; that is superseded.
- The landing page's worked example is a **committed fixture** — a frozen past assessment rendered
  statically, not a live pipeline run. This keeps "pipeline unchanged" and "no new measurement" true.
- Biassemble is a link only. Combining bias analysis with claim checking over the same text is a
  deliberate deferral, not a rejection.
