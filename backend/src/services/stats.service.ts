import { sql } from "drizzle-orm";
import { getDb } from "@/drizzle/config";

export interface StatsSnapshot {
  generatedAt: string;
  /** Null when no production run exists — an aggregate over zero rows yields SQL NULL,
   *  and "null" rendered as a date is how that used to reach the page. */
  window: { from: string; to: string } | null;
  productionRuns: number;
  evalRuns: number;
  promptVersions: { extract: string; verify: string }[];
  verdicts: { verdict: string; n: number }[];
  totalClaims: number;
}

const q = async (s: ReturnType<typeof sql>): Promise<Record<string, unknown>[]> => {
  const r = (await getDb().execute(s)) as unknown as { rows?: Record<string, unknown>[] };
  return Array.isArray(r) ? r : (r.rows ?? []);
};

// The one definition of the Stats page's figures — the route and scripts/generate-stats.ts both
// call this, so a live page and a committed snapshot can never disagree about what they mean.
export async function buildStatsSnapshot(): Promise<StatsSnapshot> {
  // Three independent queries in one round trip. Only the eval count depends on the window, so it
  // waits; the rest would just be occupying a pooled connection in series for no reason.
  const [[win], verdicts, prompts] = await Promise.all([
    // The window is the production runs themselves — eval runs are counted over the same dates so
    // the two numbers are comparable, which is the whole point of publishing the second (T012 #2).
    q(sql`
      SELECT min(created_at)::date AS from_date, max(created_at)::date AS to_date, count(*)::int AS runs
      FROM grounnel.grounnel_runs WHERE source = 'production'`),
    q(sql`
      SELECT coalesce(c.verdict, 'no_verdict') AS verdict, count(*)::int AS n
      FROM grounnel.grounnel_claims c JOIN grounnel.grounnel_runs r USING (run_id)
      WHERE r.source = 'production' GROUP BY 1 ORDER BY 2 DESC`),
    q(sql`
      SELECT DISTINCT prompt_version_extract AS extract, prompt_version_verify AS verify
      FROM grounnel.grounnel_runs
      WHERE source = 'production' AND created_at > now() - interval '7 days'
        AND prompt_version_extract IS NOT NULL AND prompt_version_verify IS NOT NULL
      ORDER BY 1 DESC, 2 DESC LIMIT 3`),
  ]);

  // An aggregate with no GROUP BY returns a row even over zero matches, so this is null rather
  // than absent — and skipping the eval query keeps `BETWEEN null AND null` out of the database.
  const window =
    win?.from_date == null || win?.to_date == null
      ? null
      : { from: String(win.from_date), to: String(win.to_date) };

  const [evals] = window
    ? await q(sql`
        SELECT count(*)::int AS runs FROM grounnel.grounnel_runs
        WHERE source = 'eval' AND created_at::date BETWEEN ${window.from} AND ${window.to}`)
    : [{ runs: 0 }];

  return {
    generatedAt: new Date().toISOString(),
    window,
    productionRuns: Number(win?.runs ?? 0),
    evalRuns: Number(evals.runs),
    promptVersions: prompts.map((p) => ({ extract: String(p.extract), verify: String(p.verify) })),
    verdicts: verdicts.map((v) => ({ verdict: String(v.verdict), n: Number(v.n) })),
    totalClaims: verdicts.reduce((sum, v) => sum + Number(v.n), 0),
  };
}
