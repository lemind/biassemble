# Feature Specification: Grounnel — Backend Proxy

**Feature Directory**: `specs/003-grounnel-backend`

**Branch**: `grounnel`

**Created**: 2026-08-11 (retroactive — implementation predates this spec; see Status)

**Status**: Implemented (retroactively specified — see "Note on retroactive status" below)

**Input**: Derived from `docs/decisions/001-grounnel-backend-proxy.md` (ADR-001) and `docs/decisions/003-grounnel-session-linkage-amendment.md` (ADR-003), which record the decisions this spec formalizes into the standard spec.md → plan.md → tasks.md shape AGENTS.md requires for new features. This work (commits `d1e7e02`, `2ab5308`) was built and merged before this spec existed — this document exists to close that process gap, not to plan new work.

## Note on retroactive status

AGENTS.md requires spec.md → plan.md → tasks.md for new features; this one shipped via ADRs alone. `specs/002-grounnel-frontend/` (the frontend feature that consumes this backend) was built spec-first and, during its own review, surfaced this gap explicitly. This spec documents the backend **as built and live-verified** (2026-08-11, this session — real `curl` calls against a running `next dev` server, both `AI_CLIENT_MODE=dev-mock` and `AI_CLIENT_MODE=core` paths, through this repo's actual proxy code, not bypassed), not as a forward-looking plan.

## User Scenarios & Testing

### User Story 1 - A frontend submits text for fact-checking without holding any AI credential (Priority: P1)

A frontend client (today: `frontend/src/` at `/grounnel`; potentially other future clients) needs to submit arbitrary text for fact-checking and receive a durable run identifier, without ever holding `AI_CORE_API_KEY` or knowing `biassemble-core`'s URL.

**Why this priority**: This is the entire reason this proxy exists (D020, `biassemble-core`'s own decision that Grounnel routes through this repo) — without it, either the frontend must hold a private credential (unacceptable) or Grounnel has no path to a browser at all.

**Independent Test**: `POST /api/grounnel/extract { text }` with no `Authorization` header and no knowledge of `biassemble-core`'s existence returns `202 { id }` within a few seconds.

**Acceptance Scenarios**:

1. **Given** a caller with no AI credentials, **When** they `POST /api/grounnel/extract` with valid non-empty text, **Then** the system returns `202` with a durable `id` that can be polled for status.
2. **Given** a request with empty or non-string `text`, **When** it's submitted, **Then** the system returns `400` without calling `biassemble-core` at all.
3. **Given** a valid submission, **When** it's processed, **Then** the system creates a session in its own database first (ADR-003) and forwards that session's id to `biassemble-core` as `sessionId`, before any AI call is made.
4. **Given** `biassemble-core` is unreachable or returns an error, **When** a submission is made, **Then** the caller receives a mapped error status (not a raw 500 with no context) via `AppException`.

---

### User Story 2 - A frontend polls a run's status without a second credential (Priority: P1)

Having received a run id, a client polls for its current state — claims, verdicts, sources, progress — until the run completes.

**Why this priority**: Grounnel's entire value is a live, pollable result; without this endpoint the extract call would be a dead end.

**Independent Test**: `GET /api/grounnel/status/:id` with no AI credential returns the same shape `biassemble-core` itself returns for that id, unmodified.

**Acceptance Scenarios**:

1. **Given** a valid, in-progress run id, **When** the caller polls its status, **Then** the system returns `200` with the full `StatusResponse` shape (`status`, `progress`, `claims[]`, `score`, `caps_hit`, `started_at`, `elapsed_seconds`), unmodified from what `biassemble-core` returned.
2. **Given** an unknown or invalid run id, **When** status is requested, **Then** the system returns a mapped error status, not a raw crash.
3. **Given** a run in any state (`extracting`/`verifying`/`done`/`failed`), **When** status is polled, **Then** the response's `claims[]` always includes every claim found so far, each with a stable `id`, regardless of that claim's own `pending`/`done`/`failed` status.

---

### User Story 3 - The real end-user's IP reaches `biassemble-core`'s rate limiter, not this proxy's own egress IP (Priority: P2)

`biassemble-core` enforces a per-IP rate limit on `/extract`. Routing through this proxy must not silently turn that into "N requests total across every user," which is what happens if the proxy's own IP is what core sees.

**Why this priority**: A real, if quiet, correctness bug (ADR-001 §4) — not P1 because the feature works without it, but a materially different (and much stricter) rate-limit than anyone decided on purpose if left unfixed.

**Independent Test**: Two different real client IPs, submitting through this proxy, are rate-limited independently by `biassemble-core`, not pooled into one bucket.

**Acceptance Scenarios**:

1. **Given** a request arrives at this proxy with a real `x-forwarded-for` value, **When** it's forwarded to `biassemble-core`, **Then** that real IP is sent via `X-Grounnel-Client-IP`, not this proxy's own request IP.
2. **Given** no `x-forwarded-for` is present (local dev, direct testing), **When** the request is forwarded, **Then** `biassemble-core` falls back to its own `request.ip` unchanged — no broken request, no crash.

### Edge Cases

- What happens when `biassemble-core`'s response fails this proxy's own Zod validation (a schema drift between repos)? — The request fails loudly rather than passing a silently-wrong response to the client, but not as cleanly as it should: `parseJsonFromAi` throws a plain `ParseError`, not the purpose-built `aiParseError()` → `AppException` (`AI_PARSE_ERROR`, 502) that already exists in `lib/errors.ts` for exactly this case but has zero call sites — so a caller currently gets a generic, uncoded 500 instead of a typed 502. Real, confirmed gap (2026-08-11 review), not a design choice — tracked as `tasks.md` T015.
- What happens when `AI_CLIENT_MODE=dev-mock` is active (local development, no live `biassemble-core` key)? — Both endpoints work identically in shape, returning fixed mock data, so frontend development is never blocked on a live core deployment or key.
- What happens when a caller polls a run id that was never created by this proxy (e.g., a stale/malformed id)? — `biassemble-core` returns its own not-found-shaped error; this proxy passes that through via `AppException`, not a generic 500.
- What happens to the session row created for a submission — is it ever updated after creation? — No. No status update, no `session_data` write. The full run lifecycle lives entirely in `biassemble-core`'s own state; this repo's session row exists only to have been created, for future cross-run analytics linkage (ADR-003 §2, D023), never read back by this repo.
- What happens if the frontend ever tries to call `biassemble-core` directly instead of through this proxy? — It cannot without `AI_CORE_API_KEY`, which this proxy never exposes to any client; this is the actual security boundary, not a convention that could be silently bypassed by a motivated client.

## Requirements

### Functional Requirements

- **FR-001**: System MUST expose `POST /api/grounnel/extract { text }`, requiring no caller-supplied AI credential, returning `202 { id }` on success.
- **FR-002**: System MUST reject non-string or empty `text` with `400` before making any call to `biassemble-core`.
- **FR-003**: System MUST create a session record in this repo's own database for every accepted submission, before calling `biassemble-core`, reusing the existing generic `sessions` mechanism — no new table, no new columns (ADR-003).
- **FR-004**: System MUST forward the created session's id to `biassemble-core` as `sessionId` on the `/extract` call.
- **FR-005**: System MUST forward the real end-user IP (from `x-forwarded-for`) to `biassemble-core` via a dedicated `X-Grounnel-Client-IP` header, distinct from the ambiguous/spoofable `X-Forwarded-For` name, falling back silently to no header (and thus `biassemble-core`'s own `request.ip`) when unavailable.
- **FR-006**: System MUST expose `GET /api/grounnel/status/:id`, requiring no caller-supplied AI credential, returning the full `StatusResponse` shape unmodified from `biassemble-core`.
- **FR-007**: System MUST validate every response from `biassemble-core` against a Zod schema mirroring `biassemble-core`'s own contract field-for-field before returning it to the caller.
- **FR-008**: System MUST map `biassemble-core` errors and internal errors to typed `AppException`s with appropriate HTTP status codes, never a bare unhandled 500 with no context. **Known gap (2026-08-11 review, not yet fixed)**: two paths currently fall short of this — (1) `biassemble-core` response parse/schema failures throw a plain `ParseError`, not the existing-but-unused `aiParseError()`; (2) `handleCreateGrounnelExtract`'s own text-validation failure throws a plain `Error`, not the existing-but-unused `validationError()`. Both currently surface as generic 500s instead of typed, correctly-coded responses. Tracked as `tasks.md` T015.
- **FR-009**: System MUST support a `dev-mock` mode with fixed, schema-valid responses for both endpoints, requiring no live `biassemble-core` deployment or credential.
- **FR-010**: System MUST NOT expose `AI_CORE_API_KEY`, `AI_CORE_BASE_URL`, or any other `biassemble-core` connection detail to any caller of these two routes.
- **FR-011**: System MUST NOT write any status update or Grounnel-specific data back to the local session record after creation — the run's full lifecycle lives in `biassemble-core`'s own state.
- **FR-012**: System MUST keep route handlers thin (parse/validate/call-service/map-errors only) — business logic lives in the service layer, not the route files (AGENTS.md Architecture: "API routes must stay thin"; implementation: `services/grounnel.service.ts`, see plan.md).

### Key Entities

- **Session**: A generic, anonymous identity row in this repo's own Postgres (`id`, `status`, `createdAt`, `updatedAt`) — the same mechanism the reflection product already uses, not a Grounnel-specific concept. Created once per Grounnel submission, never updated afterward for Grounnel's purposes.
- **AiClient**: The boundary interface (`lib/ai/client.ts`) through which this repo talks to AI Core — two implementations, `core-client.ts` (real HTTP calls to `biassemble-core`) and `dev-mock-client.ts` (fixed local responses), selected by `AI_CLIENT_MODE`.
- **ExtractClaimsRequest / GrounnelStatusOutput**: The two DTOs (`lib/ai/contracts.ts`) mirroring `biassemble-core`'s own `grounnel.schemas.ts` field-for-field — this repo's only knowledge of Grounnel's actual data shape.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A client with zero AI credentials can complete a full submit → poll → done cycle using only these two endpoints — confirmed live in this session (both `dev-mock` and real `core` mode, through this exact proxy code).
- **SC-002**: Local frontend development against Grounnel requires no live `biassemble-core` key or deployment (`AI_CLIENT_MODE=dev-mock` is sufficient) — confirmed live.
- **SC-003**: `biassemble-core`'s per-IP rate limiter sees the real end-user IP, not this proxy's own egress IP, for every request routed through this proxy.
- **SC-004**: Every `biassemble-core` response is schema-validated before reaching a caller — a schema drift between the two repos fails loudly (a parse error), not silently (a shape mismatch passed through unchecked).
- **SC-005**: No `biassemble-core` connection detail (URL, API key) is ever observable from a client of these two routes — confirmed by design (never present in either route's or either DTO's response shape) and by the frontend's own contract (`specs/002-grounnel-frontend/spec.md` FR-015) never referencing one.

## Assumptions

- `biassemble-core`'s own `/extract` and `/status/:id` routes, auth (`authHook`, static shared `AI_CORE_API_KEY`), and rate limiting (per-IP, in-memory, `RateLimiter`) are out of scope for this spec and this repo — confirmed to exist and behave as described by direct inspection of `biassemble-core/src/lib/auth.ts` and `biassemble-core/src/lib/rate-limit.ts` (2026-08-11), but owned and changed only in that repo.
- The frontend (or any future client) never calls `biassemble-core` directly — this is the actual security boundary (no client ever holds `AI_CORE_API_KEY`), not a convention that depends on client cooperation. See this doc's own plan.md ("Auth model: one static shared secret, BE is the only holder") for why a hypothetical future direct-call path would require a materially different (currently unbuilt) auth model on `biassemble-core`'s side — this discussion lives here, not in `specs/002-grounnel-frontend/`, which doesn't currently address it.
- No authentication/login exists anywhere in this flow today — sessions are anonymous identity labels, not credentials. If real user auth is ever added, this spec's Assumption is that it would be built and owned entirely in this repo (`biassemble/backend`), with `biassemble-core` remaining unaware of user identity beyond the same opaque, unverified `sessionId` passthrough it already has (per this session's architecture discussion) — not designed further here, since no concrete requirement for it exists yet.
- Rate limiting itself (the actual per-IP bucket/counter) is `biassemble-core`'s responsibility, not this repo's (ADR-001 §4, D020 §5) — this repo's only obligation is forwarding the correct IP.
