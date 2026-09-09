// Semantic order for the Stats page, not count order — the reader moves from judged to unjudged,
// and the two unjudged kinds sit apart from the five verdicts. Aggregate presentation only; claim
// rendering has its own map in verdictStyle.ts, which excludes `excluded` by design.
export const VERDICT_ROWS: { key: string; label: string; bar: string }[] = [
  { key: 'supported', label: 'Supported', bar: 'bg-success' },
  { key: 'partially_supported', label: 'Partially supported', bar: 'bg-warning' },
  { key: 'contradicted', label: 'Contradicted', bar: 'bg-error' },
  { key: 'unsupported', label: 'No evidence found', bar: 'bg-gray-400' },
  { key: 'unverifiable', label: 'Unverifiable', bar: 'bg-info' },
  // Two distinct neutrals, not two near-identical greys: on a base-200 page the previous
  // pair vanished into the track and into each other, in both the bar and the swatch column.
  { key: 'excluded', label: 'Not eligible to check', bar: 'bg-base-content/25' },
  { key: 'no_verdict', label: 'Verification failed', bar: 'bg-base-content/50' },
];

// Deliberately judged, not failed. `no_verdict` is a verification that errored and is never
// counted here — folding it in would pad the number the principle rests on.
export const ABSTAINED_VERDICTS = ['unverifiable', 'excluded'];
