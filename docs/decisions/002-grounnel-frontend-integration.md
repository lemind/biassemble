# ADR-002 — Grounnel: Frontend Integration Shape

### Status: ACCEPTED (skeleton/boundary only — see §6) · Date: 2026-08-06

Settles where Grounnel's frontend lives and how it talks to the backend. Does **not** settle the actual UI — claim-span highlighting, the score header, the evidence panel — which is real, sizable design/build work with no spec yet. This ADR exists so that work has a foundation to start from, per the same `spec-driven-development` discipline `biassemble-core`'s Grounnel work has followed throughout.

## 1. Context

`biassemble-core/specs/009-grounnel/spec.md` names Grounnel's frontend as explicitly out of scope for that repo, and — until now — genuinely undecided anywhere: no repo, no page, no spec. `biassemble-core/docs/decisions/020-...md` (D020) already resolved the one thing that *would* have blocked deciding this — the frontend never calls `biassemble-core` directly, so wherever it lives, it talks to `biassemble/backend` (this repo) instead. That removed the technical blocker. The product question — new app vs. extend the existing one — was still open until this ADR.

## 2. Decision

**Grounnel is a new route inside the existing `biassemble/frontend` Vite app — not a separate app or repo.**

Reasons, in order of weight:
- The existing app already has everything a paste-box-and-poll tool needs: an API client (`src/api/client.ts`), a polling hook to model directly (`usePollAssessment.ts`), error/loading scaffolding (`ErrorBoundary`, `LoadingFallback`, `BiassembleLayout`), and a single Vercel deploy target already configured.
- A separate app means a second repo or package, its own CI, its own Vercel project, its own copy of shared UI chrome — real setup cost with no corresponding benefit; nothing about Grounnel needs isolation from the reflection product (no shared state, no shared auth, no conflicting dependency).
- AGENTS.md's own stated priority — "prefer existing platform/framework capabilities before adding libraries," "avoid abstractions before the third real use case" — argues for extension over a second app when the first app already fits.

## 3. Routing — no new dependency

The current app has no router at all (`App.tsx` is a manual phase-based state machine, single `/` URL). Grounnel needs its own bookmarkable/shareable URL (a paste-and-check tool people link to is more useful than one buried behind app state), but adding `react-router` or similar for exactly one new route is disproportionate, and this repo's dependencies require explicit approval before adding (AGENTS.md).

**Decision:** a single `window.location.pathname === '/grounnel'` check at the top of `App.tsx`, branching to a new `<GrounnelApp />` tree before any of the existing phase logic runs. No router, no new dependency, no change to the existing `/` flow. If Grounnel later needs more than one URL (e.g. a shareable `/grounnel/:id` results link), that's the third real use case AGENTS.md's own bar names — revisit the no-router decision then, not now.

## 4. API boundary

`src/api/client.ts` gains two functions, matching the existing file's own shape exactly:

```ts
export async function submitGrounnelText(text: string) {
  const response = await apiClient.post("/api/grounnel/extract", { text });
  return response.data; // { id }
}

export async function getGrounnelStatus(id: string) {
  const response = await apiClient.get(`/api/grounnel/status/${id}`);
  return response.data; // full StatusResponse, per ADR-001 §2
}
```

These call `biassemble/backend`'s new routes (ADR-001), never `biassemble-core`. No new env var beyond the existing `VITE_API_URL` — same backend, same origin, new paths.

## 5. Polling model

`usePollAssessment.ts` is the direct template: `setInterval` + a timeout guard + swallow-and-retry on transient fetch errors. A new `usePollGrounnelStatus` hook follows the same shape, polling `getGrounnelStatus` — `biassemble-core/specs/009-grounnel/spec.md`'s ~10-second cadence assumption (not `usePollAssessment`'s 2s; Grounnel's pipeline is a longer-running, multi-claim process, not a single assessment call) is a real, deliberate difference to carry over, not an oversight if a future implementer copies the 2s value by habit.

## 6. Explicitly not decided here — the next spec

This ADR settles the skeleton: where the code lives, how it's reached, how it's rerouted, how it polls. It does **not** settle:

- The actual claim-span highlighting/recoloring UI over pasted text (v10 §6, §8 in `biassemble-core`'s `initial-context.md`).
- The score header's exact layout and copy.
- The click-through evidence panel's shape.
- Whether/how this connects to the B2B audit product's own "consumer demo/teaser" framing floated in `/home/dl/_prog/biassemble/docs/ADR-000-b2b-audit-path.md` §4 step 8 / §5.6 — that document never names Grounnel specifically (confirmed by search), so treat any connection between the two as a real open strategic question, not settled fact, worth raising with the user directly rather than assumed either way.

These need their own `spec-driven-development` pass (`spec.md` → `plan.md` → `tasks.md`) before any of that UI gets built — the same discipline `biassemble-core`'s side of Grounnel has followed throughout, not skipped now that a frontend exists to build.

## 7. Consequences

- `frontend/src/components/grounnel/` (new directory) holds this feature's components, kept separate from the existing reflection-product components rather than interleaved — matches the existing `components/common/` vs. feature-component split.
- `App.tsx`'s pathname branch is a small, deliberate exception to "no router" that should not silently grow into hand-rolled routing for more paths — §3's own stated limit.
- This ADR unblocks writing Grounnel's actual frontend spec (§6), which was the real blocker before now — no spec could reasonably propose UI without knowing whether it's a new app or a page in the existing one.

## 8. Related documents

`docs/decisions/001-grounnel-backend-proxy.md` (this repo's backend-side counterpart) · `biassemble-core/docs/decisions/019-...md`, `020-...md` (D019/D020) · `biassemble-core/specs/009-grounnel/spec.md`, `initial-context.md` (SPEC-GROUNNEL v10 — the UI details §6 defers) · `specs/001-reflection-flow/architecture.md` (this repo's existing frontend/backend split, the pattern §2–§5 extend) · `/home/dl/_prog/biassemble/docs/ADR-000-b2b-audit-path.md` (unconfirmed possible strategic link, §6).
