# Implementation Plan: Grounnel — Backend Proxy

**Branch**: `grounnel` | **Date**: 2026-08-11 (retroactive) | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-grounnel-backend/spec.md`

## Summary

This documents an **already-built, already-merged** feature (commits `d1e7e02`, `2ab5308`), not a forward plan — see spec.md's "Note on retroactive status." Two new route files, one new service, two `AiClient` methods (across the interface, `core-client.ts`, `dev-mock-client.ts`), and one validation schema. All of it live-tested in this session (2026-08-11): `dev-mock` mode via a locally-run `next dev` + `curl`, and `core` mode through this repo's actual proxy code (not bypassed) against the real deployed `biassemble-core`.

## Technical Context

**Language/Version**: TypeScript 5.x+ (strict), Next.js 15 API routes.

**Storage**: This repo's existing Postgres (Drizzle), reusing the existing generic `sessions` table — no new table, no migration.

**AI boundary**: `biassemble-core` (private repo), HTTP, `AI_CORE_API_KEY` Bearer auth — same pattern the reflection product's `generateQuestion`/`generateAssessment` already use, not a new integration shape.

**Testing**: No dedicated test suite was added for this feature (confirmed by inspection — no `grounnel`-named test files under `backend/`, unlike `biassemble-core`'s own `tests/integration/grounnel-*.test.ts`). This is a real, if minor, gap — see Complexity Tracking.

**Constraints**: No new tables/columns on `sessions`/`session_data` (ADR-001 §5, ADR-003). No Inngest/queue wiring — both routes are synchronous pass-throughs (ADR-001 §5, D019 §1). No change to the reflection product's existing two `AiClient` methods.

## Architecture — the two-hop relay

```
FE (never holds AI_CORE_API_KEY)
  │  POST /api/grounnel/extract { text }
  ▼
BE route (backend/src/app/api/grounnel/extract/route.ts)
  │  reads x-forwarded-for → clientIp
  ▼
handleCreateGrounnelExtract (backend/src/services/grounnel.service.ts)
  │  1. validate text (grounnelTextSchema)
  │  2. createSession() — THIS repo's own Postgres, generic `sessions` table
  │  3. getAiClient().extractClaims({ sessionId: session.id, text, clientIp })
  ▼
core-client.ts (AI_CLIENT_MODE=core) — postCore("/extract", { text, sessionId }, extractClaimsOutputSchema, { X-Grounnel-Client-IP })
  │  Authorization: Bearer AI_CORE_API_KEY
  ▼
biassemble-core POST /extract  →  { id: runId }  (core's OWN id, not session.id)
  ▲
  └── returned unchanged as { id } to FE — FE polls with runId, never session.id
```

Polling (`GET /api/grounnel/status/:id`) is the same two-hop shape, minus session creation — `status/[id]/route.ts` → `handleGetGrounnelStatus` → `getGrounnelStatus(id)` → `getCore("/status/:id", grounnelStatusResponseSchema)` → relayed back unmodified.

**Why session creation happens here, in the extract route, and nowhere else**: ADR-003 amends ADR-001's original "no session linkage" position specifically because `biassemble-core`'s own D023 added a durable-persistence layer (`grounnel_runs.session_id`) that needed *something* to key history by, and reusing the reflection product's existing generic session mechanism was cheaper than inventing a new one. This is additive and reversible by design (ADR-003 §3) — deleting the `createSession()` call and passing `sessionId: undefined` is a one-line rollback, since `biassemble-core` already treats the field as optional.

## Design Decisions

### Auth model: one static shared secret, BE is the only holder

Confirmed by direct inspection of `biassemble-core/src/lib/auth.ts` (2026-08-11): every request to `biassemble-core` needs `Authorization: Bearer <AI_CORE_API_KEY>`, checked against one env var — no per-caller, per-session, or per-user distinction exists on `biassemble-core`'s side. This repo is the only holder of that key (AGENTS.md's own secrets table). This is intentionally the entire security boundary: no client of these two routes can reach `biassemble-core` directly, because none of them can ever obtain the key — not because of a policy any client is trusted to honor, but because the key is server-side-only by construction (`getCoreConfig()` reads `process.env`, never returned in any response).

**A hypothetical future "FE calls `biassemble-core` directly" path is explicitly out of scope for this plan** — not because it's undesirable in principle, but because it requires a materially different auth model on `biassemble-core`'s side (verifying a BE-issued credential without a live round-trip back to BE, e.g. a signed token) that doesn't exist today and isn't being built here. If that's ever pursued, it's `biassemble-core`-side work with a corresponding BE-side token-issuance piece — a different, larger feature, not a variant of this one.

### Session linkage is write-once, read-never (by this repo)

`createSession()` is called exactly once per submission, and the resulting row is never updated or read back by any Grounnel code path afterward (confirmed: `handleGetGrounnelStatus` never touches the `sessions` table at all — it's a pure passthrough to `getGrounnelStatus`). The session's only purpose is to exist, so its `id` can be handed to `biassemble-core` as an opaque, unverified, nullable `sessionId` column value (`grounnel_runs.session_id`, no FK — confirmed in `biassemble-core/src/db/schema.ts`) for future cross-run analytics. This repo currently has no code that ever reads Grounnel history back out of that linkage — it's pure write-side plumbing for a consumer that doesn't exist yet.

### Errors are typed, not generic 500s

Both routes catch `AppException` specifically and use its `statusCode`, falling back to a generic 500 with the raw error message only for genuinely unexpected errors (`error instanceof Error ? error.message : "..."`). This matches the reflection product's own established error-handling convention (`lib/errors.ts`), not a Grounnel-specific pattern — reused, not reinvented.

## Project Structure

### Source Code (as built)

```text
backend/src/
├── app/api/grounnel/
│   ├── extract/route.ts          # POST — thin: parse, clientIp, call service, map errors
│   └── status/[id]/route.ts      # GET — thin: call service, map errors
├── services/
│   └── grounnel.service.ts       # handleCreateGrounnelExtract, handleGetGrounnelStatus
├── lib/
│   ├── validation/grounnel.ts    # grounnelTextSchema (text.min(1))
│   └── ai/
│       ├── client.ts             # AiClient interface += extractClaims, getGrounnelStatus
│       ├── contracts.ts          # += ExtractClaimsRequest/Output, GrounnelStatusOutput schemas
│       ├── core-client.ts        # += extractClaims (postCore), getGrounnelStatus (new getCore helper)
│       ├── dev-mock-client.ts    # += fixed mock responses for both methods
│       └── index.ts              # unchanged — getAiClient() already mode-switches generically
└── lib/db/queries.ts              # createSession() — pre-existing, reused unchanged
```

No new tables, no new Drizzle migration, no new top-level directory — every file above either already existed (extended) or slots into an existing directory pattern the reflection product established first.

## Constitution Check

*GATE: Pass, with one named gap — see Complexity Tracking below.* No new dependencies. Routes stay thin (FR-012), business logic in `services/`. No prompts/model IDs in this public repo (unchanged — `core-client.ts` still only makes HTTP calls, never sees a prompt). Reuses existing `sessions` mechanism rather than inventing a new one (KISS, "avoid abstractions before the third real use case" — this is the second use of the generic session concept, not a new one).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| No automated tests for this feature (confirmed gap, not a design choice) | N/A — this is a real gap, not a justified complexity tradeoff | N/A |
| `AppException` mapping is incomplete — two error paths (`biassemble-core` response parse failures, and `handleCreateGrounnelExtract`'s own validation error) throw plain `Error`/`ParseError` instead of the existing, unused `aiParseError()`/`validationError()` helpers, so FR-008 isn't fully true of the current code (confirmed 2026-08-11 review) | N/A — a real, pre-existing gap this retroactive spec surfaced, not introduced by it | N/A |

Neither row is phrased as a justified tradeoff — both are honest gaps this retroactive spec surfaces rather than papers over. See tasks.md's Phase 2 (T012–T015) for the concrete follow-up.

## Related documents

`docs/decisions/001-grounnel-backend-proxy.md` (ADR-001, the original decision this plan formalizes) · `docs/decisions/003-grounnel-session-linkage-amendment.md` (ADR-003, session linkage) · `specs/002-grounnel-frontend/` (the consumer of this API, whose own review is what surfaced this spec's absence).

**Note on `.specify/feature.json`**: deliberately left pointing at `specs/002-grounnel-frontend` (unchanged by this spec's creation) — `002` is the actively-implemented feature (its `tasks.md` T001–T021 are not yet built), while this directory documents already-shipped work retroactively. Recorded here so the choice reads as intentional, not an oversight.
