import { z } from 'zod';

// The frontend owns this: it is the WIRE contract, validated against an untrusted 200, not a
// mirror of the backend's domain type. Deliberately duplicated rather than shared — see spec 004.

// Shape, not just type. `String(null)` produced the literal "null" for these fields once, and a
// bare z.string() accepts it — the rejection has to be the format, or the guarantee is fiction.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const timestamp = z
  .string()
  .refine((v) => Number.isFinite(Date.parse(v)), 'expected a parseable timestamp');

export const StatsSnapshotSchema = z.object({
  generatedAt: timestamp,
  // Null is a real state: a database with no production runs has no window. Absent is not.
  window: z.object({ from: isoDate, to: isoDate }).nullable(),
  productionRuns: z.number(),
  evalRuns: z.number(),
  promptVersions: z.array(z.object({ extract: z.string(), verify: z.string() })),
  verdicts: z.array(z.object({ verdict: z.string(), n: z.number() })),
  totalClaims: z.number(),
});

export type StatsSnapshot = z.infer<typeof StatsSnapshotSchema>;
