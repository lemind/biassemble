import { useEffect, useState } from 'react';
import fallbackStats from '../data/stats';
import type { StatsSnapshot } from '../types/stats';
import { getStats } from '../api/client';
import { VERDICT_ROWS, INDEFINITE_VERDICTS, bucketVerdicts } from '../lib/verdictRows';

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
  // Fallback-first: the committed snapshot is already in the bundle, so the page paints real
  // numbers immediately and upgrades in place. The freshness row is what tells the two apart.
  const [stats, setStats] = useState<StatsSnapshot>(fallbackStats);
  // Three states, not a boolean: "still asking" is not "asked and failed", and a boolean made the
  // page assert the figures were unavailable for the whole time the request was in flight.
  const [freshness, setFreshness] = useState<'loading' | 'live' | 'fallback'>('loading');

  useEffect(() => {
    let cancelled = false;
    getStats()
      .then((fresh) => {
        if (cancelled) return;
        setStats(fresh);
        setFreshness('live');
      })
      .catch(() => {
        if (!cancelled) setFreshness('fallback');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const live = freshness === 'live';
  const n = (key: string) => stats.verdicts.find((v) => v.verdict === key)?.n ?? 0;
  const { other } = bucketVerdicts(stats.verdicts);
  const total = stats.totalClaims;
  const indefinite = INDEFINITE_VERDICTS.reduce((sum, key) => sum + n(key), 0);
  const failed = n('no_verdict');
  const fmt = (x: number) => x.toLocaleString('en-GB');
  // Every percentage below divides by it. A database with no production claims is not a crash.
  const pct = (x: number) => (total === 0 ? 0 : (x / total) * 100);

  return (
    <article className="mx-auto max-w-[40rem] px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-base-content/50">Lab snapshot</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">What we have measured</h1>

      <dl className="mt-8 space-y-1 border-l-2 border-base-300 pl-4 text-sm">
        <Meta label="Window">
          {stats.window
            ? `${longDate(stats.window.from)} – ${longDate(stats.window.to)}`
            : 'No production runs recorded'}
        </Meta>
        <Meta label={live ? 'Updated' : 'Taken'}>{longDate(stats.generatedAt)}</Meta>
        <Meta label="Prompts">
          {stats.promptVersions.map((p) => `extract ${p.extract} / verify ${p.verify}`).join(' · ')}
        </Meta>
      </dl>
      <p className="mt-3 text-sm text-base-content/55">
        {freshness === 'live' &&
          'These figures are refreshed hourly. A cached result may be served while a fresh one is fetched.'}
        {freshness === 'loading' &&
          'Showing the last committed snapshot while the current figures load.'}
        {freshness === 'fallback' &&
          'Live figures were unavailable, so these are the last committed snapshot and may be out of date.'}
        {stats.promptVersions.length > 1 &&
          ' These runs span more than one extraction prompt version; the figures below combine them.'}
      </p>

      <h2 className="mt-14 text-sm uppercase tracking-widest text-base-content/50">
        Most of this is us
      </h2>
      <p className="mt-4 leading-relaxed text-base-content/80">
        {fmt(stats.productionRuns)} production runs were recorded in this window. Evaluation runs
        are excluded from every number below. Over the same dates we also ran {fmt(stats.evalRuns)}{' '}
        internal evals against fixed tests.
      </p>
      <p className="mt-4 leading-relaxed text-base-content/80">
        Almost all {fmt(stats.productionRuns)} were our own test articles while building the system.
        Read this page as a record of what the tool does — not as proof that anyone else is using
        it.
      </p>

      <h2 className="mt-14 text-sm uppercase tracking-widest text-base-content/50">Verdict mix</h2>
      <p className="mt-4 leading-relaxed text-base-content/80">{fmt(total)} claims.</p>

      <div className="mt-5 flex h-2 overflow-hidden rounded bg-base-100">
        {VERDICT_ROWS.filter((r) => n(r.key) > 0).map((r) => (
          <div key={r.key} className={r.bar} style={{ width: `${pct(n(r.key))}%` }} />
        ))}
        {other > 0 && <div className="bg-base-content/15" style={{ width: `${pct(other)}%` }} />}
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
          {other > 0 && (
            <tr className="border-b border-base-200 last:border-0">
              <td className="w-4 py-2">
                <span className="inline-block h-2 w-2 rounded-full bg-base-content/15" aria-hidden />
              </td>
              <td className="py-2 text-base-content/80">Other</td>
              <td className="py-2 text-right font-mono tabular-nums text-base-content/70">
                {fmt(other)}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="mt-6 leading-relaxed text-base-content/80">
        {fmt(indefinite)} of them — {Math.round(pct(indefinite))}% — did not receive a
        definitive factual verdict: {fmt(n('excluded'))} were excluded from checking and{' '}
        {fmt(n('unverifiable'))} were unverifiable from the evidence found. That is deliberate
        behaviour, not a shortfall. The other {failed} are different again: verification failed
        rather than reaching any judgement.
      </p>

      <h2 className="mt-14 text-sm uppercase tracking-widest text-base-content/50">
        One observed incorrect contradiction
      </h2>
      <div className="mt-4 border-l-2 border-base-content/25 pl-4">
        <p className="leading-relaxed text-base-content/80">
          On 8 September 2026 a run marked a claim{' '}
          <strong className="font-medium">contradicted</strong> when the cited evidence did not
          establish a contradiction: it described a different organisation that happened to share
          the same name. The claim should also have been excluded as non-checkable rather than
          judged at all.
        </p>
        <p className="mt-4 leading-relaxed text-base-content/80">
          That is the failure this system is built to avoid. It happened.
        </p>
      </div>
      <p className="mt-4 leading-relaxed text-base-content/80">
        We are not publishing a false-positive rate. One observed case is a sample of one, and a
        rate needs a labelled denominator we do not have yet — hundreds of contradicted claims read
        by hand. Until that exists, the paragraph above is the number.
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
