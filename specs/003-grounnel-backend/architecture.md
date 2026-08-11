# Architecture: How a request moves between FE, BE, and Core

**Feature**: [003-grounnel-backend](spec.md) | **Plan**: [plan.md](plan.md) | **Consumer**: [002-grounnel-frontend](../002-grounnel-frontend/spec.md)

## The three parties

| Repo | Role | Holds `AI_CORE_API_KEY`? | Holds a real session/identity? |
|---|---|---|---|
| `biassemble/frontend` (FE) | Browser, `/grounnel` page | No — never, by construction | No — only ever sees core's `runId` |
| `biassemble/backend` (BE) | This spec — the proxy | Yes — the only holder | Yes — owns the `sessions` table |
| `biassemble-core` (Core) | Private pipeline (Gemini, search, verify) | N/A (verifies BE's key) | No — stores BE's `session.id` as an inert, unverified column |

## Submission — `POST /api/grounnel/extract`

```text
FE                          BE                              Core
│                            │                                │
│─ POST /grounnel/extract ──▶│                                │
│   { text }                 │                                │
│   (no credential)          │─ 1. grounnelTextSchema.parse    │
│                            │─ 2. createSession()             │
│                            │      (BE's own Postgres,        │
│                            │       generic `sessions` table) │
│                            │─ 3. extractClaims({             │
│                            │      sessionId: session.id,     │
│                            │      text, clientIp })          │
│                            │                                │
│                            │─ POST /extract ────────────────▶│
│                            │   Authorization: Bearer         │
│                            │     AI_CORE_API_KEY             │
│                            │   X-Grounnel-Client-IP: <real   │
│                            │     end-user IP, not BE's own>  │
│                            │   { text, sessionId }           │
│                            │                                │─ authHook: checks key
│                            │                                │─ rate limiter: checks IP
│                            │                                │─ EXTRACT stage (Gemini)
│                            │                                │─ mints its OWN runId
│                            │                                │─ stores sessionId as an
│                            │                                │   inert column (no FK) on
│                            │                                │   grounnel_runs
│                            │◀──── { id: runId } ─────────────│
│◀──── { id: runId } ────────│                                │
│   (this is CORE's id,      │                                │
│    not session.id — FE     │                                │
│    never sees session.id)  │                                │
```

## Polling — `GET /api/grounnel/status/:id`, every 5s (ADR-002 §5)

```text
FE                          BE                              Core
│                            │                                │
│─ GET /status/:runId ──────▶│                                │
│   (no credential)          │─ getGrounnelStatus(runId)       │
│                            │   (no session lookup at all —   │
│                            │    this route never touches     │
│                            │    the `sessions` table)        │
│                            │─ GET /status/:runId ────────────▶│
│                            │   Authorization: Bearer         │
│                            │     AI_CORE_API_KEY             │
│                            │◀──── StatusResponse ─────────────│
│                            │─ Zod-validate against            │
│                            │   grounnelStatusResponseSchema  │
│◀──── StatusResponse ───────│   (unmodified if valid)         │
│                            │                                │
│  ...repeat every 5s until status ∈ {done, failed}...         │
```

## What never happens

- **FE never holds or sees `AI_CORE_API_KEY`** — not in any response, not in any env var shipped to the browser. This is the actual security boundary (FR-010), not a convention.
- **FE never sees or uses `session.id`** — only `runId` (core's own identity) crosses back to the browser. `session.id` is written once, by BE, into core's `grounnel_runs.session_id` column, and never appears in any FE-facing response.
- **BE never updates the `sessions` row after creating it** — no status write, no completion timestamp. The entire run lifecycle (`extracting → verifying → done|failed`) lives only in Core's own state; BE's session row exists purely so it has been created, for future cross-run analytics Core's own D023 layer might use.
- **Core never independently verifies `session.id`** — it's an opaque, nullable, non-FK value Core trusts only because the request already passed `authHook` (BE's static key). If FE ever called Core directly, `session.id` would carry zero authentication weight as-is — see plan.md's "Auth model" Design Decision for what that would actually require.

## Why two separate identities exist (`session.id` vs `runId`)

They answer two different questions, owned by two different databases:

- **`session.id`** (BE-owned, Postgres, `sessions` table): "which anonymous browser session made this submission" — for future cross-run history (D023), not used by anything in the live extract→poll→done path today.
- **`runId`** (Core-owned, Redis + Postgres, `grounnel_runs.run_id`): "which pipeline execution is this" — the actual identity that drives extraction, verification, and status polling. This is what FE polls with.

Collapsing them into one id was considered and rejected implicitly by the original design (D023 §2 adds `sessionId` as a *separate* nullable column on `grounnel_runs`, not as the primary key) — `runId` needs to exist independent of whether a session was ever supplied at all (a direct/test caller with no `sessionId` still gets a working run), so it can't be the same value as an optional, BE-only concept.
