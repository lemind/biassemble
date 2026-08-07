import { getAiClient } from "@/lib/ai";
import { createSession } from "@/lib/db/queries";
import { grounnelTextSchema } from "@/lib/validation/grounnel";

/**
 * Mirrors handleCreateSession's shape (session.service.ts) with one real difference: no
 * createSessionData/updateSessionStatus call. Grounnel has no local product data or multi-stage
 * lifecycle to track here — the full lifecycle lives in biassemble-core's own Redis/Postgres,
 * polled directly via getGrounnelStatus, never read back by this repo (ADR-003 §2).
 */
export async function handleCreateGrounnelExtract(text: string, clientIp?: string) {
  const result = grounnelTextSchema.safeParse({ text });
  if (!result.success) {
    throw new Error(`Invalid text: ${result.error.issues[0]?.message ?? "required"}`);
  }

  // Session exists purely to give this submission a stable identity for D023 §2's history/
  // analytics linkage — same anonymous sessions table the reflection product already uses,
  // no new mechanism (ADR-003).
  const session = await createSession();

  const ai = getAiClient();
  const aiResult = await ai.extractClaims({ sessionId: session.id, text, clientIp });

  // aiResult.id is biassemble-core's own grounnel run id — the frontend polls with THIS id,
  // not the local session id (ADR-002 §4).
  return { id: aiResult.id };
}

export async function handleGetGrounnelStatus(id: string) {
  const ai = getAiClient();
  return ai.getGrounnelStatus(id);
}
