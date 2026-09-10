import { sql } from "drizzle-orm";
import { getDb } from "@/drizzle/config";

export interface StatsSnapshot {
  generatedAt: string;
  window: { from: string; to: string };
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
  // The window is the production runs themselves — eval runs are counted over the same dates so
  // the two numbers are comparable, which is the whole point of publishing the second (T012 #2).
  const [win] = await q(sql`
    SELECT min(created_at)::date AS from_date, max(created_at)::date AS to_date, count(*)::int AS runs
    FROM grounnel.grounnel_runs WHERE source = 'production'`);

  const [evals] = await q(sql`
    SELECT count(*)::int AS runs FROM grounnel.grounnel_runs
    WHERE source = 'eval' AND created_at::date BETWEEN ${win.from_date} AND ${win.to_date}`);

  const verdicts = await q(sql`
    SELECT coalesce(c.verdict, 'no_verdict') AS verdict, count(*)::int AS n
    FROM grounnel.grounnel_claims c JOIN grounnel.grounnel_runs r USING (run_id)
    WHERE r.source = 'production' GROUP BY 1 ORDER BY 2 DESC`);

  const prompts = await q(sql`
    SELECT DISTINCT prompt_version_extract AS extract, prompt_version_verify AS verify
    FROM grounnel.grounnel_runs
    WHERE source = 'production' AND created_at > now() - interval '7 days'
      AND prompt_version_extract IS NOT NULL AND prompt_version_verify IS NOT NULL
    ORDER BY 1 DESC, 2 DESC LIMIT 3`);

  return {
    generatedAt: new Date().toISOString(),
    window: { from: String(win.from_date), to: String(win.to_date) },
    productionRuns: Number(win.runs),
    evalRuns: Number(evals.runs),
    promptVersions: prompts.map((p) => ({ extract: String(p.extract), verify: String(p.verify) })),
    verdicts: verdicts.map((v) => ({ verdict: String(v.verdict), n: Number(v.n) })),
    totalClaims: verdicts.reduce((sum, v) => sum + Number(v.n), 0),
  };
}
