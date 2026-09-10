// Semantic order for the Stats page, not count order — judged before unjudged. Aggregate
// presentation only; claim rendering has its own map in verdictStyle.ts.
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

// Claims that reached no definitive verdict. NOT abstentions: `unverifiable` WAS judged. 
// `no_verdict` errored and is never counted here — folding it in would pad the number.
export const INDEFINITE_VERDICTS = ['unverifiable', 'excluded'];
