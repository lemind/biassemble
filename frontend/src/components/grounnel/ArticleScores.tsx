import { articleScore, completenessColor, groundednessColor } from '../../lib/articleScore';
import type { Claim } from '../../types/grounnel';

const SUPPRESSED_COPY = {
  'too-few': 'Not enough claims checked to score',
  'no-direction': 'No decisive evidence either way',
} as const;

function Figure({ value, color, label }: { value: string; color: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 py-4">
      <div className={`text-5xl font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs uppercase tracking-widest text-base-content/60">{label}</div>
    </div>
  );
}

/** Only rendered for a finished run — mid-run these swing wildly as claims resolve. */
export default function ArticleScores({ claims }: { claims: Claim[] }) {
  const score = articleScore(claims);

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-2 p-4">
        <div className="flex flex-col sm:flex-row">
          {score.groundedness === null ? (
            <div className="flex flex-1 flex-col items-center gap-1 py-4 text-center">
              <div className="text-base font-medium text-base-content/60">
                {SUPPRESSED_COPY[score.suppressed!]}
              </div>
              <div className="text-xs uppercase tracking-widest text-base-content/60">Groundedness</div>
            </div>
          ) : (
            <Figure
              value={String(score.groundedness)}
              color={groundednessColor(score.groundedness)}
              label="Groundedness"
            />
          )}
          <Figure
            value={String(score.completeness)}
            color={completenessColor(score.completeness)}
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
