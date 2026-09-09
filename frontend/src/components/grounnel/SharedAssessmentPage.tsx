import { useEffect, useState } from 'react';
import HighlightedArticle from './HighlightedArticle';
import ClaimSourceList from './ClaimSourceList';
import { getSharedAssessment } from '../../api/client';
import type { Claim, SharedAssessment, SharedClaim } from '../../types/grounnel';

// A shared claim carries no id (core 019 FR-009 keeps internal identifiers out) and no citations
// (core never persisted them), so both are synthesised here. Position is a stable key for a frozen
// assessment; a shared page shows no inline citation numbers where a live run does.
//
// Claim status comes from the RUN's status, not from the verdict alone: on a run still verifying,
// a claim with no verdict is pending, not failed. Reading it off the verdict would label every
// unfinished claim "Verification failed".
function toClaim(claim: SharedClaim, index: number, runStatus: SharedAssessment['status']): Claim {
  const unfinished = runStatus === 'extracting' || runStatus === 'verifying';
  return {
    id: `shared-${index}`,
    text: claim.text,
    status: claim.verdict !== null ? 'done' : unfinished ? 'pending' : 'failed',
    verdict: claim.verdict,
    evidence: claim.evidence,
    confidence: claim.confidence,
    reason: claim.reason,
    sources: claim.sources,
    citations: [],
    sourceExcerpt: claim.sourceExcerpt,
  };
}

const STATUS_NOTE: Record<SharedAssessment['status'], string | null> = {
  done: null,
  extracting: 'This check is still running — claims are still being pulled out of the text. This page does not update on its own; reload to see progress.',
  verifying: 'This check is still running — some claims have no verdict yet. This page does not update on its own; reload to see progress.',
  failed: 'This check did not finish. What it had reached is shown below; the rest was never checked.',
};

export default function SharedAssessmentPage({ token }: { token: string }) {
  const [assessment, setAssessment] = useState<SharedAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // try/catch, never `await ….catch()` (AGENTS.md Rule 11).
    const load = async () => {
      try {
        const data = await getSharedAssessment(token);
        if (!cancelled) setAssessment(data);
      } catch {
        // A wrong token, a withdrawn run and a transport failure are indistinguishable by design
        // (019 FR-010), so the message must not claim to know which one happened.
        if (!cancelled) setError('This link could not be opened.');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">This link could not be opened</h1>
        <p className="mt-2 text-base-content/70">
          It may be mistyped, or the check may no longer exist.{' '}
          <a className="link" href="/">
            Check a text of your own
          </a>
          .
        </p>
      </div>
    );
  }

  if (!assessment) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-base-content/60">Loading…</div>;
  }

  const claims = assessment.claims.map((claim, i) => toClaim(claim, i, assessment.status));
  // Keyed on the RUN's status, not on a null verdict — different states (core 019 FR-011); the
  // per-claim case is what sourceNote handles.
  const note = STATUS_NOTE[assessment.status];

  return (
    <div className="bg-base-200 px-4 py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">A shared check</h1>
          <p className="text-sm text-base-content/60">
            Run on {assessment.createdAt.slice(0, 10)} · {claims.length} claims. Anyone with this
            link can read it.
          </p>
        </div>

        {note && <div className="alert alert-warning text-sm py-2">{note}</div>}

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <HighlightedArticle articleText={assessment.text} claims={claims} />
          </div>
        </div>

        <ClaimSourceList articleText={assessment.text} claims={claims} />

        <p className="text-sm">
          <a className="link" href="/">
            Check a text of your own
          </a>
        </p>
      </div>
    </div>
  );
}
