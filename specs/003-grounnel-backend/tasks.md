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

## Phase 2: Gap closure (Priority: P2) ✅ Done

- [x] T015 Closed the `AppException` mapping gap: `lib/ai/parsers.ts`'s `parseJsonFromAi` now throws `aiParseError()` (AI_PARSE_ERROR, 502) instead of the dead-end `ParseError` class (removed — zero other call sites); `services/grounnel.service.ts`'s `handleCreateGrounnelExtract` now throws `validationError()` (VALIDATION_ERROR, 400) instead of a plain `Error`. **Also found and fixed while implementing this**: `extract/route.ts` had its own redundant inline `!text` check that intercepted every case before the service's Zod validation could ever run — the service-level fix was correct but unreachable via HTTP until this route-level duplicate was removed too. Verified live via `curl` (empty/missing/non-string text → 400 with specific messages; valid text → 202) and by direct unit test of both fixed functions.
- [x] T013 [P] Unit test for `clientIpFrom()` — `backend/tests/unit/http.test.ts` (multi-value/whitespace/missing/empty/malformed `x-forwarded-for`, 6 cases). Extracted `clientIpFrom()` out of `extract/route.ts` into `backend/src/lib/http.ts` first — it was a private, unexported function inside a route file, not testable in isolation otherwise.
- [x] T012 [P] Integration tests — `backend/tests/integration/grounnel.test.ts` + `backend/src/lib/tests/grounnel-flow.ts` (mirrors `reflection-flow.ts`'s shape), extending the existing `reflection-flow.test.ts` convention. Covers empty-text → 400, valid submission → 202, status poll → 200 with the full response shape, run via `pnpm test:integration:grounnel` against a live `AI_CLIENT_MODE=dev-mock` server. Also added `tests/unit/parsers.test.ts` (T015's `parseJsonFromAi` fix: invalid JSON and schema-mismatch both now throw `AppException`) and `tests/unit/grounnel.service.test.ts` (T015's `handleCreateGrounnelExtract` fix). New `pnpm test:unit` script.
- [x] T014 Documented the `AI_CORE_BASE_URL` misconfiguration risk — `.env.example` now has a comment telling the next person to check what port `biassemble-core`'s own `pnpm dev` actually binds to, not assume one.

**Checkpoint**: 12 tests (11 unit, 1 integration) pass against a live `dev-mock` server; clean `tsc --noEmit`. Verified the pre-existing `reflection-flow.test.ts` timeout is unrelated to this phase's changes (reproduced on a clean baseline via `git stash`). No database migration involved.

---

## Phase 3: Citation provenance passthrough (biassemble-core D027)

- [x] T016 [US1] `grounnelClaimCitationSchema` + `citations` on `grounnelClaimSchema` — `backend/src/lib/ai/contracts.ts`, mirroring `biassemble-core/src/contracts/grounnel.schemas.ts`'s new `ClaimCitationSchema` field-for-field. `.default([])`, same pattern as `retrievalMethod`/`started_at` — without it this field would be silently stripped by `getCore`'s strict parse in `core-client.ts`, exactly the drift class T002's own note already warns about.
- [x] T017 [P] [US1] `dev-mock-client.ts` fixture — added one `citations` entry to the mock claim so local dev-mock flow exercises the new field instead of always hitting the `[]` default path.

**Checkpoint**: `tsc --noEmit` clean.

## Dependencies & Execution Order

- Phase 1 is complete; nothing here blocks `specs/002-grounnel-frontend/`'s own tasks, which consume this API as-is.
- Phase 2 is independent, additive, and does not block frontend work — sequence it whenever, not as a prerequisite to shipping Grounnel's frontend.

## Notes

- Phase 1 required no backend code changes (it documents what already shipped). Phase 2 did — see its Checkpoint above.
- Task numbering restarts at T001 for this feature directory (self-contained, not a continuation of `specs/001-reflection-flow/` or `specs/002-grounnel-frontend/`'s numbering).
