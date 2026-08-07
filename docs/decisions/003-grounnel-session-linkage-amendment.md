# ADR-003 — Amends ADR-001 §5: Grounnel Does Get Session Linkage, on `biassemble-core`'s Own Terms

### Status: ACCEPTED · Date: 2026-08-07

Narrowly amends ADR-001 §5's "no new auth/login/session linkage for Grounnel" line. Everything else in ADR-001 (the two-method `AiClient` shape, the route files, the `X-Grounnel-Client-IP` rate-limit fix) is unchanged and still governs.

## 1. What changed

`biassemble-core/docs/decisions/023-grounnel-durable-persistence.md` (D023, written the same day as ADR-001, after it) reopened `biassemble-core`'s D019 §4/D020 §5 to add durable history/analytics — one of its two named triggers is "a user should be able to see past checks," which needs *something* to key history by. D023 §2's answer: reuse this repo's **already-existing, already-generic** `sessions` table (`id`/`status`/`createdAt`/`updatedAt`, no product-specific columns) — the same mechanism `session.service.ts`'s `handleCreateSession` already uses for the reflection product — rather than inventing a new one.

ADR-001 §5 was written to rule out inventing a **new** session/login system for Grounnel, at a time before D023 existed to give a reason to reuse the **existing** one. Both documents are correct for what they were deciding; this ADR reconciles them by making the distinction explicit, since ADR-001's literal wording ("no new auth/login/session linkage") reads as a blanket ban that would incorrectly block this.

## 2. Decision

**Grounnel's `/api/grounnel/extract` route creates a session via the exact same `createSession()` this repo's `sessions` table already provides** — no new table, no new column, no `session_data` row (that part of ADR-001 §5 is unchanged and still correct: Grounnel's actual result data lives in `biassemble-core`'s own `grounnel_runs`/`grounnel_claims`, D023 §3, not here). The created session's `id` is passed to `biassemble-core`'s `POST /extract` as `sessionId` in the request body — a field that repo added specifically to receive it (D023 §2/T028). No status update, no `session_data` write: unlike the reflection product, Grounnel has no local multi-stage lifecycle to track — the full lifecycle lives in `biassemble-core`'s Redis/Postgres, polled directly by the frontend via `getGrounnelStatus`, never read back by this repo.

**Still true, unchanged from ADR-001 §5:**
- No new tables/columns on `sessions`/`session_data` for Grounnel.
- No Inngest wiring for Grounnel's flow.
- No new login/auth system, no user accounts — this is the same anonymous, per-submission session identity the reflection product already has, not a new concept.

## 3. Why this is safe to amend without a bigger discussion

The amendment is additive and reversible: `sessions` rows created for Grounnel are indistinguishable in shape from reflection-product ones (same table, same columns) — nothing here couples the two products' data or behavior. If this ever needs to be undone, the fix is one line in `handleCreateGrounnelExtract` (stop creating a session, pass `sessionId: undefined`) — `biassemble-core`'s side already treats it as optional.

## 4. Consequences

- ADR-001 §2's route/client shape is unchanged; `extractClaims`'s request type gains `sessionId: string`.
- `services/grounnel.service.ts` (new, mirrors `session.service.ts`'s `handleCreateSession` shape) owns this — not the route file itself, matching this repo's existing thin-route convention.

## 5. Related documents

`docs/decisions/001-grounnel-backend-proxy.md` (ADR-001, this amends §5 only) · `biassemble-core/docs/decisions/023-grounnel-durable-persistence.md` (D023 §2 — the reopening this amendment responds to) · `src/services/session.service.ts` (the pattern reused, not reinvented).
