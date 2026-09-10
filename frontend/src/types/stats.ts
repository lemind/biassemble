import { z } from 'zod';

// The frontend owns this: it is the WIRE contract, validated against an untrusted 200, not a
// mirror of the backend's domain type. Deliberately duplicated rather than shared — see spec 004.
export const StatsSnapshotSchema = z.object({
  generatedAt: z.string(),
  // Null is a real state, not an error: a database with no production runs has no window. The
  // string "null" reaching this field is exactly what the schema exists to reject.
  window: z.object({ from: z.string(), to: z.string() }).nullable(),
  productionRuns: z.number(),
  evalRuns: z.number(),
  promptVersions: z.array(z.object({ extract: z.string(), verify: z.string() })),
  verdicts: z.array(z.object({ verdict: z.string(), n: z.number() })),
  totalClaims: z.number(),
});

export type StatsSnapshot = z.infer<typeof StatsSnapshotSchema>;
