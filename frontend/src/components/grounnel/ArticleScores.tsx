import { articleScore, completenessColor, groundednessColor } from '../../lib/articleScore';
import type { Counts } from '../../lib/articleScore';
import type { Claim } from '../../types/grounnel';

const SUPPRESSED_COPY = {
  'too-few': 'Fewer than five claims were checked, so a score would be noise.',
  'no-direction': 'Nothing was confirmed or contradicted, so there is no direction to report.',
} as const;

const COMPLETENESS_SUPPRESSED_COPY = {
  'nothing-checkable': 'This text contains no factual claims to check.',
  capped: 'The claim limit was reached, so how much is left unchecked is unknown.',
} as const;

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A ring, not a bare number: 0–100 is only obvious once the remaining arc is visible. Plain SVG
 *  because daisyUI's radial-progress cannot take an arbitrary stroke colour. */
function ScoreRing({ value, colorClass }: { value: number | null; colorClass: string }) {
  const filled = value ?? 0;
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" className="stroke-base-300" />
        {value !== null && (
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            stroke="currentColor"
            className={colorClass}
            strokeDasharray={CIRCUMFERENCE}
            // A literal 0 draws no arc at all, making the worst possible score geometrically
            // identical to "no score". Keep a visible stub so the ring always says which it is.
            strokeDashoffset={CIRCUMFERENCE * (1 - Math.max(filled, 1.5) / 100)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {value === null ? (
          <span className="text-3xl text-base-content/30">—</span>
        ) : (
          <>
            <span className={`text-4xl font-semibold leading-none tabular-nums ${colorClass}`}>{value}</span>
            <span className="mt-0.5 text-xs text-base-content/40">of 100</span>
          </>
        )}
      </div>
    </div>
  );
}

function Score({
  value,
  colorClass,
  label,
  note,
}: {
  value: number | null;
  colorClass: string;
  label: string;
  note?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 py-2">
      <ScoreRing value={value} colorClass={colorClass} />
      <div className="text-xs uppercase tracking-widest text-base-content/60">{label}</div>
      {note && <p className="max-w-56 text-center text-xs text-base-content/50">{note}</p>}
    </div>
  );
}

// The counts the two scores rest on. Sample size used to be folded into completeness, where it
// silently capped short articles; showing it is both more honest and more useful.
function basis(c: Counts): string {
  // Partial support is named explicitly: it is half-credited in the score, so omitting it made
  // the number and its own justification read as disagreeing.
  const parts = [
    `${c.supported} of ${c.checked} checked claims supported by retrieved evidence`,
    c.partiallySupported > 0 ? `${c.partiallySupported} partly` : null,
    c.contradicted > 0 ? `${c.contradicted} contradicted` : null,
  ].filter(Boolean);
  return parts.join(', ');
}

/** Only rendered for a finished run — mid-run these swing wildly as claims resolve. */
export default function ArticleScores({ claims, capsHit }: { claims: Claim[]; capsHit: boolean }) {
  const score = articleScore(claims, capsHit);

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Score
            value={score.groundedness}
            colorClass={score.groundedness === null ? '' : groundednessColor(score.groundedness, score.counts)}
            label="Groundedness"
            note={score.suppressed ? SUPPRESSED_COPY[score.suppressed] : basis(score.counts)}
          />
          <Score
            value={score.completeness}
            colorClass={score.completeness === null ? '' : completenessColor(score.completeness)}
            label="Assessment completeness"
            note={
              score.completenessSuppressed
                ? COMPLETENESS_SUPPRESSED_COPY[score.completenessSuppressed]
                : undefined
            }
          />
        </div>
        <p className="text-xs text-base-content/60">
          Groundedness reflects how strongly the checked claims are supported by retrieved
          evidence; contradictions weigh heavily against it. Assessment completeness reflects how
          much of the article Grounnel actually assessed. Neither is a probability that the
          article is true.
        </p>
      </div>
    </div>
  );
}
