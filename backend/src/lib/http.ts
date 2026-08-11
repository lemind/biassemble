// Generic request-header helpers — no Grounnel/reflection-specific logic here.

// Real end-user IP, not this server's own egress IP (ADR-001 §4) — x-forwarded-for's first
// value is the original client per the standard proxy-chain convention; Vercel sets this header.
export function clientIpFrom(request: Request): string | undefined {
  const xff = request.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || undefined;
}
