// No router for one extra path (ADR-002 §3) — one shared pathname check, not a routing
// abstraction. Used by both App.tsx (which route to mount) and BiassembleLayout.tsx (which
// cross-link to show) so the two can never independently drift on what "the Grounnel route" is.
export function isGrounnelRoute() {
  return window.location.pathname === '/grounnel';
}
