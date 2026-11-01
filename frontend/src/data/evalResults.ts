// Golden-set results, hand-copied from biassemble-core eval runs. A dated snapshot, not live data:
// update the numbers and dates together after the next full three-model run.

export const consistency = {
  since: '2026-09-07',
  runs: 574,
  checks: 671,
  testClaims: 33,
  alwaysCorrect: 12,
  outcomes: [
    { label: 'Got the expected verdict', n: 571 },
    { label: '"Can\'t verify" on a claim that could be checked', n: 70 },
    { label: 'Claim not picked up, or the check failed', n: 14 },
    { label: 'Passed a false claim as true', n: 11 },
    { label: 'Called a true claim false', n: 5 },
  ],
  mostLetThrough: {
    claim: 'The first computer mouse was wireless.',
    runs: 42,
    caught: 26,
    cantVerify: 8,
    slipped: 8,
  },
};

export const modelComparison = {
  date: '2026-10-29',
  cases: 28,
  repeats: 3,
  checks: 99,
  models: [
    { name: 'Gemini', model: 'gemini-2.5-flash-lite', correct: 98, falseAccusations: 0 },
    { name: 'DeepSeek', model: 'deepseek-flash', correct: 93, falseAccusations: 0 },
    { name: 'Qwen', model: 'qwen3.7-flash', correct: 89, falseAccusations: 2 },
  ],
};

export const consistencyPct = (n: number) => `${Math.round((n / consistency.checks) * 1000) / 10}%`;

/** Plain-text summary for the crawler shell; the page itself renders the same figures. */
export const evalSummary = [
  `Since ${consistency.since}, ${consistency.checks.toLocaleString('en-GB')} re-checks of ${consistency.testClaims} fixed test claims, most of them traps, across three models: ` +
    consistency.outcomes.map((o) => `${consistencyPct(o.n)} ${o.label.toLowerCase()}`).join('; ') +
    '.',
  `Same ${modelComparison.cases} test cases, ${modelComparison.repeats} runs each, on ${modelComparison.date}: ` +
    modelComparison.models.map((m) => `${m.name} ${m.correct} of ${modelComparison.checks} expected verdicts`).join(', ') +
    '.',
];
