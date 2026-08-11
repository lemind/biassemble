# Tasks: Grounnel — Backend Proxy

**Input**: [plan.md](plan.md), [spec.md](spec.md)

**Path convention**: `backend/src/...` only.

**Note**: Phase 1 is retroactive — already built and merged (commits `d1e7e02`, `2ab5308`) before this spec existed. Marked `[x]` with the real commit/file each task landed in, not aspirational. Phase 2 is the one genuine gap this retroactive spec surfaced.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other same-phase `[P]` tasks — different files, no dependency on another task in the *same* phase (`specs/002-grounnel-frontend/tasks.md`'s convention).
- **[Story]**: Which user story (spec.md priorities) this task belongs to.

---

## Phase 1: Core proxy (Priority: P1) ✅ Done — commits `d1e7e02`, `2ab5308`

- [x] T001 [US1] `grounnelTextSchema` — `backend/src/lib/validation/grounnel.ts`: `text.min(1)` pre-check, ahead of `biassemble-core`'s own `ExtractRequestSchema`
- [x] T002 [US1] Grounnel DTOs — `backend/src/lib/ai/contracts.ts`: `extractClaimsOutputSchema`, `grounnelStatusResponseSchema` (+ nested claim/source/score schemas), mirroring `biassemble-core/src/contracts/grounnel.schemas.ts` field-for-field — re-synced 2026-08-11 (`2ab5308`) after drift was found (`retrievalMethod`, `started_at`, `elapsed_seconds` had been silently stripped by an earlier, stricter parse)
- [x] T003 [US1] `AiClient` interface — `backend/src/lib/ai/client.ts`: += `extractClaims(input)`, `getGrounnelStatus(id)`
- [x] T004 [US1] `getCore()` helper — `backend/src/lib/ai/core-client.ts`: GET-equivalent of the existing POST-only `postCore()`, same auth/error-handling shape, needed because `GET /status/:id` is core's first GET-shaped Grounnel call
- [x] T005 [US1] `core-client.ts` implementations — `extractClaims` (via `postCore`, forwards `X-Grounnel-Client-IP` when `clientIp` is present), `getGrounnelStatus` (via `getCore`)
- [x] T006 [US1] `dev-mock-client.ts` implementations — fixed, schema-valid responses for both methods, no live core key required
- [x] T007 [US1] `services/grounnel.service.ts` — `handleCreateGrounnelExtract` (validate → `createSession()` → `extractClaims`), `handleGetGrounnelStatus` (thin passthrough)
- [x] T008 [US1] `POST /api/grounnel/extract/route.ts` — parse body, extract real client IP from `x-forwarded-for`, call service, map `AppException`/generic errors to status codes
- [x] T009 [US1] `GET /api/grounnel/status/[id]/route.ts` — call service, map errors
- [x] T010 [US2] Session linkage — `handleCreateGrounnelExtract` calls `createSession()` (reused, unmodified `lib/db/queries.ts`) before the AI call, forwards `session.id` as `sessionId` (ADR-003)
- [x] T011 [US3] `X-Grounnel-Client-IP` forwarding — `clientIpFrom()` in the extract route reads `x-forwarded-for`'s first value; `core-client.ts` only sets the header when a value is present, so local calls without one still work (core falls back to its own `request.ip`)

**Checkpoint**: Both endpoints implemented and functional end to end (verification evidence: see plan.md's Summary).

---

## Phase 2: Gap closure (Priority: P2) — not started

- [ ] T012 [P] Integration tests — `backend/tests/integration/grounnel.test.ts`, extending this repo's existing convention (`backend/tests/integration/reflection-flow.test.ts` already exists — this is not a new pattern): `POST /api/grounnel/extract` and `GET /api/grounnel/status/:id` against `AI_CLIENT_MODE=dev-mock`, covering the 400/202/200 paths and the `AppException` mapping (including T015's fixes, once landed)
- [ ] T013 [P] Unit test for `X-Grounnel-Client-IP` forwarding logic (`clientIpFrom()`) — multi-value `x-forwarded-for`, missing header, malformed header
- [ ] T014 Document the local `AI_CORE_BASE_URL` misconfiguration risk found this session (`backend/.env.local` pointed at an unrelated local project on port 3001 instead of `biassemble-core`'s real local port 3011) as a checked-in note (e.g. `.env.example` comment) so it doesn't quietly recur for the next person who sets up local `core`-mode testing
- [ ] T015 Close the `AppException` mapping gap (2026-08-11 review, spec.md FR-008/Edge Cases, plan.md Complexity Tracking): (1) `lib/ai/parsers.ts`'s `parseJsonFromAi` should throw the existing `aiParseError()` (or callers should catch `ParseError` and rethrow via it) instead of a plain `ParseError` that neither route recognizes; (2) `services/grounnel.service.ts`'s `handleCreateGrounnelExtract` should throw `validationError()` instead of `new Error(...)` for its text-validation failure. Both currently fall through to a generic uncoded 500 instead of the typed, correctly-statused response FR-008 promises

## Dependencies & Execution Order

- Phase 1 is complete; nothing here blocks `specs/002-grounnel-frontend/`'s own tasks, which consume this API as-is.
- Phase 2 is independent, additive, and does not block frontend work — sequence it whenever, not as a prerequisite to shipping Grounnel's frontend.

## Notes

- No backend code changes are required by this spec — it documents what already shipped. Phase 2 is the only real forward-looking work.
- Task numbering restarts at T001 for this feature directory (self-contained, not a continuation of `specs/001-reflection-flow/` or `specs/002-grounnel-frontend/`'s numbering).
