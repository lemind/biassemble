# ADR-001 — Grounnel: `biassemble/backend`'s Proxy Layer

### Status: ACCEPTED · Date: 2026-08-06

Formalizes, from this repo's side, the decision already made in `biassemble-core/docs/decisions/020-grounnel-routes-through-biassemble-backend.md` (D020): this repo proxies Grounnel's `POST /extract` and `GET /status/:id` on behalf of a frontend that never calls `biassemble-core` directly. That ADR settled *why* the proxy exists. This one settles *how it's built here*, mirroring existing structure rather than inventing a new one.

## 1. Context

`biassemble-core` (private repo) now has a working, tested Grounnel API surface — `POST /extract`, `GET /status/:id`, Redis-backed, no Postgres, no queue. Nothing in `biassemble/backend` (this repo) exists to reach it yet. This repo already does exactly this kind of proxying for the reflection product (`generateQuestion`, `generateAssessment` in `lib/ai/core-client.ts`), so the question isn't "should we proxy" (D020 answered that) but "does Grounnel's proxy look like the existing one, or does it need its own shape."

## 2. Decision

**Grounnel's proxy is two new methods on the existing `AiClient` interface, not a parallel client.**

- `lib/ai/contracts.ts` gains `extractClaimsRequestSchema`/`extractClaimsResponseSchema` and `grounnelStatusResponseSchema` (Zod, mirroring `questionOutputSchema`/`assessmentOutputSchema`'s existing shape).
- `lib/ai/client.ts`'s `AiClient` interface gains `extractClaims(input): Promise<ExtractClaimsOutput>` and `getGrounnelStatus(id): Promise<GrounnelStatusOutput>`.
- `lib/ai/core-client.ts` implements both against `biassemble-core`'s real routes, reusing `postCore()` for `extractClaims` and adding a `getCore()` GET-equivalent for `getGrounnelStatus` (no such helper exists yet — `postCore` is POST-only).
- `lib/ai/dev-mock-client.ts` implements both with fixed responses, same as the reflection product's mocks — `AI_CLIENT_MODE=dev-mock` must keep working for Grounnel too, not silently break because a mock method is missing.
- Two new route files, `app/api/grounnel/extract/route.ts` and `app/api/grounnel/status/[id]/route.ts`, as thin as `app/api/story/route.ts` — parse/validate the request, call `getAiClient()`, map errors to status codes, nothing else.

## 3. Auth — unchanged, not re-decided

`AI_CORE_API_KEY` is attached server-side in `core-client.ts` exactly as it already is for the two existing calls (`getCoreConfig()`, unchanged). Nothing about Grounnel changes this — restated here only so it's not read as an open question.

## 4. Rate limiting — a gap D020 didn't close, closed here

D020 §5 explicitly decided per-IP rate limiting stays a `biassemble-core`-side concern (`RateLimiter` keyed on `request.ip`, T011) and that this repo does **not** build its own. That decision stands. But D020 was written from `biassemble-core`'s side and didn't specify how the IP that limiter sees should be determined once every request arrives via a server-to-server proxy instead of a direct browser call.

**As currently built, this breaks the limiter's intent, not just its precision**: `biassemble-core`'s `request.ip` will be `biassemble/backend`'s own outbound IP (or a shared Vercel egress) for every Grounnel user, every time. "5 requests per IP per hour" silently becomes "5 requests total, across every user of the product, per hour" — not a degraded version of the control, a different and much stricter one that nobody decided on purpose.

**Decision:** `biassemble/backend`'s Grounnel proxy route forwards the real end-user IP (read from Vercel's own `x-forwarded-for` on the incoming request) to `biassemble-core` via a header — `X-Grounnel-Client-IP`, not reusing the ambiguous, easily-spoofed `X-Forwarded-For` name for an internal, already-authenticated hop. `biassemble-core`'s `routes/grounnel.ts` needs a small matching change to prefer this header over `request.ip` when present, falling back to `request.ip` unchanged when it's absent (local dev, direct testing) — **not yet made**, tracked as a required follow-up in `biassemble-core`'s own tasks.md when this ADR is acted on, not silently assumed to already exist.

## 5. Scope boundary — same "do not" list as D020 §5, restated for this repo

- No new tables/columns on `sessions`/`session_data` for Grounnel.
- No Inngest wiring for Grounnel's flow — the two new routes are synchronous pass-throughs; `biassemble-core`'s own request/poll handling is the entire async model (D019 §1).
- No new auth/login/session linkage for Grounnel.
- No change to the reflection product's existing two `AiClient` methods or routes — purely additive.

## 6. Consequences

- `biassemble-core`'s `/extract` route needs the `X-Grounnel-Client-IP`-preferring change (§4) before this proxy's rate limiting behaves as originally specified — sequence this repo's T013-equivalent work after that change lands there, or land both together.
- `AiClient`'s dev-mock parity means local frontend development against Grounnel never needs a live `biassemble-core` key — same story as reflection today.
- This ADR does not cover the frontend at all — see ADR-002.

## 7. Related documents

`biassemble-core/docs/decisions/019-grounnel-pipeline-trust-boundary.md` (D019 — pipeline, gates, Redis-only state) · `biassemble-core/docs/decisions/020-grounnel-routes-through-biassemble-backend.md` (D020 — why this repo proxies at all) · `biassemble-core/specs/009-grounnel/spec.md`, `tasks.md` (T013 — the API-surface-side task this ADR's §2 scopes) · `specs/001-reflection-flow/architecture.md` (this repo's existing Public App / Private AI Core boundary, the pattern §2 mirrors).
