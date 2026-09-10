import { articleScore, completenessColor, groundednessColor } from '../../lib/articleScore';
import type { Claim } from '../../types/grounnel';

const SUPPRESSED_COPY = {
  'too-few': 'Fewer than five claims were checked, so a score would be noise.',
  'no-direction': 'Nothing was confirmed or refuted, so there is no direction to report.',
} as const;

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A ring, not a bare number: 0–100 is only obvious once the remaining arc is visible. Drawn as
 * plain SVG rather than daisyUI's radial-progress, which cannot take an arbitrary stroke colour.
 */
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
            strokeDashoffset={CIRCUMFERENCE * (1 - filled / 100)}
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

/** Only rendered for a finished run — mid-run these swing wildly as claims resolve. */
export default function ArticleScores({ claims }: { claims: Claim[] }) {
  const score = articleScore(claims);

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Score
            value={score.groundedness}
            colorClass={score.groundedness === null ? '' : groundednessColor(score.groundedness)}
            label="Groundedness"
            note={score.suppressed ? SUPPRESSED_COPY[score.suppressed] : undefined}
          />
          <Score
            value={score.completeness}
            colorClass={completenessColor(score.completeness)}
            label="Assessment completeness"
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
