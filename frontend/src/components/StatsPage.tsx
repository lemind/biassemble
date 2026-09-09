import stats from '../data/stats';

// Deliberately not on this page (tasks.md Phase 3): cost and token figures, time-to-verdict,
// retrieval rates, golden-set detection numbers, confidence distributions.
const VERDICT_LABEL: Record<string, string> = {
  supported: 'Supported',
  partially_supported: 'Partially supported',
  unsupported: 'No evidence found',
  contradicted: 'Contradicted',
  unverifiable: 'Unverifiable',
  excluded: 'Not eligible to check',
  no_verdict: 'Verification failed',
};

const VERDICT_BAR: Record<string, string> = {
  supported: 'bg-success',
  partially_supported: 'bg-warning',
  unsupported: 'bg-gray-400',
  contradicted: 'bg-error',
  unverifiable: 'bg-info',
  excluded: 'bg-base-300',
  no_verdict: 'bg-base-300',
};

// Abstentions — the tool deciding not to judge. Kept apart from `no_verdict`, which is a
// verification that errored: a crash is not a principled abstention and must not pad this number.
const ABSTAINED = ['unverifiable', 'excluded'];

export default function StatsPage() {
  const { window: w, productionRuns, evalRuns, verdicts, totalClaims, generatedAt } = stats;
  const abstained = verdicts
    .filter((v) => ABSTAINED.includes(v.verdict))
    .reduce((sum, v) => sum + v.n, 0);
  const failed = verdicts.find((v) => v.verdict === 'no_verdict')?.n ?? 0;
  const prompts = stats.promptVersions
    .map((p) => `extract ${p.extract} / verify ${p.verify}`)
    .join(', ');

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">What we have measured</h1>
      <p className="mt-2 text-sm text-base-content/60">
        A snapshot of {w.from} to {w.to}, taken {generatedAt.slice(0, 10)}. Prompts in use: {prompts}
        . These numbers are fixed at the date above — they are not a live counter.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Most of this is us</h2>
      <p className="mt-3 text-base-content/80">
        {productionRuns} runs were submitted through the site in this window, and evaluation runs are
        excluded from every number on this page. Over the same dates we also ran {evalRuns} internal
        evaluation runs against fixed test sets. Even the {productionRuns} are overwhelmingly our own
        submissions while we were building the thing — treat them as a record of what the tool does,
        not as evidence that anyone is using it.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Verdict mix</h2>
      <p className="mt-3 text-base-content/80">
        {totalClaims} claims across those runs. {abstained} of them —{' '}
        {Math.round((abstained / totalClaims) * 100)}% — were left unjudged on purpose: not eligible
        to check, or unverifiable from what was found. That category is the point, not a shortfall.
        A false accusation costs more than a missed detection, so a claim we cannot stand behind is
        left alone rather than guessed. A further {failed} claims are not an abstention at all —
        their verification errored, and they are counted separately below for that reason.
      </p>

      <table className="mt-5 w-full text-sm">
        <tbody>
          {verdicts.map((v) => (
            <tr key={v.verdict} className="border-b border-base-200">
              <td className="py-2 pr-4">{VERDICT_LABEL[v.verdict] ?? v.verdict}</td>
              <td className="w-1/2 py-2">
                <div
                  className={`h-2 rounded ${VERDICT_BAR[v.verdict] ?? 'bg-base-300'}`}
                  style={{ width: `${(v.n / totalClaims) * 100}%` }}
                />
              </td>
              <td className="py-2 pl-4 text-right font-mono tabular-nums">{v.n}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-10 text-xl font-semibold">One confirmed false accusation</h2>
      <p className="mt-3 text-base-content/80">
        On 8 September 2026 a run marked a claim <em>contradicted</em> on the strength of evidence
        about a different organisation that happened to share its name. The claim was also more a
        matter of opinion than of fact, so it should not have been judged at all. That is exactly the
        failure this tool is built to avoid, and it happened.
      </p>
      <p className="mt-3 text-base-content/80">
        We are not publishing a false-positive rate. One confirmed case is a sample of one, and a
        rate needs a denominator we do not have yet — that means reading a few hundred contradicted
        claims by hand and labelling each. Until that is done, this paragraph is the honest version
        of the number.
      </p>
    </div>
  );
}
