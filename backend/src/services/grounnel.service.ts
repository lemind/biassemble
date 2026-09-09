import { getAiClient } from "@/lib/ai";
import { createSession } from "@/lib/db/queries";
import { grounnelTextSchema } from "@/lib/validation/grounnel";
import { validationError } from "@/lib/errors";

/**
 * Mirrors handleCreateSession's shape (session.service.ts) with one real difference: no
 * createSessionData/updateSessionStatus call. Grounnel has no local product data or multi-stage
 * lifecycle to track here — the full lifecycle lives in biassemble-core's own Redis/Postgres,
 * polled directly via getGrounnelStatus, never read back by this repo (ADR-003 §2).
 */
export async function handleCreateGrounnelExtract(text: string, clientIp?: string) {
  const result = grounnelTextSchema.safeParse({ text });
  if (!result.success) {
    // AppException (VALIDATION_ERROR, 400), not a plain Error — so the route's
    // `error instanceof AppException` check maps this correctly instead of falling
    // through to a generic 500 (2026-08-11 fix, T015).
    throw validationError(
      `Invalid text: ${result.error.issues[0]?.message ?? "required"}`,
      result.error.flatten()
    );
  }

  // Session exists purely to give this submission a stable identity for D023 §2's history/
  // analytics linkage — same anonymous sessions table the reflection product already uses,
  // no new mechanism (ADR-003).
  const session = await createSession();

  const ai = getAiClient();
  const aiResult = await ai.extractClaims({ sessionId: session.id, text, clientIp });

  // aiResult.id is biassemble-core's own grounnel run id — the frontend polls with THIS id,
  // not the local session id (ADR-002 §4).
  // shareToken is the run's PUBLIC address; aiResult.id is internal and must not become a URL.
  return { id: aiResult.id, shareToken: aiResult.shareToken };
}

export async function handleGetGrounnelStatus(id: string) {
  const ai = getAiClient();
  return ai.getGrounnelStatus(id);
}

/** Core spec 019 — a public read, no session and no local state; the token is the whole address. */
export async function handleGetSharedAssessment(token: string, clientIp?: string) {
  const ai = getAiClient();
  return ai.getSharedAssessment(token, clientIp);
}
