import stats from '../data/stats';
import { VERDICT_ROWS, ABSTAINED_VERDICTS } from '../lib/verdictRows';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function longDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-base-content/45">{label}</dt>
      <dd className="text-base-content/70">{children}</dd>
    </div>
  );
}

export default function StatsPage() {
  const n = (key: string) => stats.verdicts.find((v) => v.verdict === key)?.n ?? 0;
  const total = stats.totalClaims;
  const abstained = ABSTAINED_VERDICTS.reduce((sum, key) => sum + n(key), 0);
  const failed = n('no_verdict');
  const fmt = (x: number) => x.toLocaleString('en-GB');

  return (
    <article className="mx-auto max-w-[40rem] px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-base-content/50">Lab snapshot</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">What we have measured</h1>

      <dl className="mt-8 space-y-1 border-l-2 border-base-300 pl-4 text-sm">
        <Meta label="Window">
          {longDate(stats.window.from)} – {longDate(stats.window.to)}
        </Meta>
        <Meta label="Taken">{longDate(stats.generatedAt)}</Meta>
        <Meta label="Prompts">
          {stats.promptVersions.map((p) => `extract ${p.extract} / verify ${p.verify}`).join(' · ')}
        </Meta>
      </dl>
      <p className="mt-3 text-sm text-base-content/55">
        These figures are fixed at the date above. They are not a live counter.
      </p>

      <h2 className="mt-14 text-sm uppercase tracking-widest text-base-content/50">
        Most of this is us
      </h2>
      <p className="mt-4 leading-relaxed text-base-content/80">
        {fmt(stats.productionRuns)} runs in this window were submitted through the site. Evaluation
        runs are excluded from every number below. In the same dates we also ran{' '}
        {fmt(stats.evalRuns)} internal evals against fixed tests.
      </p>
      <p className="mt-4 leading-relaxed text-base-content/80">
        Even the {fmt(stats.productionRuns)} are almost all our own articles while we were building.
        Read this page as a record of what the tool does — not as proof that anyone else is using
        it.
      </p>

      <h2 className="mt-14 text-sm uppercase tracking-widest text-base-content/50">Verdict mix</h2>
      <p className="mt-4 leading-relaxed text-base-content/80">{fmt(total)} claims.</p>

      <div className="mt-5 flex h-2 overflow-hidden rounded bg-base-100">
        {VERDICT_ROWS.filter((r) => n(r.key) > 0).map((r) => (
          <div key={r.key} className={r.bar} style={{ width: `${(n(r.key) / total) * 100}%` }} />
        ))}
      </div>

      <table className="mt-5 w-full text-sm">
        <tbody>
          {VERDICT_ROWS.map((r) => (
            <tr key={r.key} className="border-b border-base-200 last:border-0">
              <td className="w-4 py-2">
                <span className={`inline-block h-2 w-2 rounded-full ${r.bar}`} aria-hidden />
              </td>
              <td className="py-2 text-base-content/80">{r.label}</td>
              <td className="py-2 text-right font-mono tabular-nums text-base-content/70">
                {fmt(n(r.key))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-6 leading-relaxed text-base-content/80">
        {fmt(abstained)} of them — {Math.round((abstained / total) * 100)}% — were left unjudged on
        purpose: not eligible to check, or unverifiable from what was found. That is the design, not
        a shortfall. A further {failed} are not abstentions: verification errored. They are listed
        separately above.
      </p>

      <h2 className="mt-14 text-sm uppercase tracking-widest text-base-content/50">
        One confirmed false accusation
      </h2>
      <div className="mt-4 border-l-2 border-base-content/25 pl-4">
        <p className="leading-relaxed text-base-content/80">
          On 8 September 2026 a run marked a claim{' '}
          <strong className="font-medium">contradicted</strong> using evidence about a different
          organisation that shared the same name. The claim was closer to opinion than fact, and
          should not have been judged.
        </p>
        <p className="mt-4 leading-relaxed text-base-content/80">
          That is the failure this system is built to avoid. It happened.
        </p>
      </div>
      <p className="mt-4 leading-relaxed text-base-content/80">
        We are not publishing a false-positive rate. One confirmed case is a sample of one. A rate
        needs a labelled denominator we do not have yet — hundreds of contradicted claims read by
        hand. Until that exists, the paragraph above is the number.
      </p>

      <nav className="mt-14 border-t border-base-300 pt-6 text-sm">
        <a className="link" href="/">
          Check a text
        </a>
        <span className="px-2 text-base-content/30">·</span>
        <a className="link" href="/about">
          About Grounnel
        </a>
      </nav>
    </article>
  );
}
