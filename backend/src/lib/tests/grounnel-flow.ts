/**
 * Shared integration test logic — runs the Grounnel extract → poll flow via the public API
 * and validates status codes + shapes. Mirrors reflection-flow.ts's role for this feature.
 *
 * Used by: tests/integration/grounnel.test.ts (vitest, local dev, AI_CLIENT_MODE=dev-mock)
 */

export interface StepResult {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface FlowResult {
  passed: boolean;
  steps: StepResult[];
  runId?: string;
}

export async function runGrounnelFlow(baseUrl: string): Promise<FlowResult> {
  const steps: StepResult[] = [];

  function ok(name: string, detail?: string) {
    steps.push({ name, ok: true, detail });
  }

  function fail(name: string, detail?: string): FlowResult {
    steps.push({ name, ok: false, detail });
    return { passed: false, steps };
  }

  // ─── Step 1: reject empty/non-string text with 400, before any AI call ───
  const emptyRes = await fetch(`${baseUrl}/api/grounnel/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "" }),
    signal: AbortSignal.timeout(10_000),
  });
  if (emptyRes.status !== 400) {
    return fail("POST /api/grounnel/extract (empty text)", `Expected 400, got ${emptyRes.status}`);
  }
  ok("POST /api/grounnel/extract (empty text) → 400");

  // ─── Step 2: valid submission → 202 { id } ────────────────────────────────
  const extractRes = await fetch(`${baseUrl}/api/grounnel/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "The Eiffel Tower was completed in 1889." }),
    signal: AbortSignal.timeout(10_000),
  });
  if (extractRes.status !== 202) {
    const text = await extractRes.text().catch(() => "");
    return fail("POST /api/grounnel/extract", `Expected 202, got ${extractRes.status}: ${text}`);
  }
  const extractBody = await extractRes.json();
  const runId: string = extractBody.id;
  if (!runId || typeof runId !== "string") {
    return fail("POST /api/grounnel/extract response", "Missing id");
  }
  ok("POST /api/grounnel/extract → 202", `id=${runId}`);

  // ─── Step 3: poll status → 200 with the full StatusResponse shape ────────
  const statusRes = await fetch(`${baseUrl}/api/grounnel/status/${runId}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (statusRes.status !== 200) {
    const text = await statusRes.text().catch(() => "");
    return fail("GET /api/grounnel/status/:id", `Expected 200, got ${statusRes.status}: ${text}`);
  }
  const statusBody = await statusRes.json();
  const requiredFields = ["id", "status", "progress", "claims", "score", "caps_hit"];
  const missing = requiredFields.filter((f) => !(f in statusBody));
  if (missing.length > 0) {
    return fail("GET /api/grounnel/status/:id response", `Missing fields: ${missing.join(", ")}`);
  }
  ok("GET /api/grounnel/status/:id → 200", `status=${statusBody.status}`);

  return { passed: true, steps, runId };
}
