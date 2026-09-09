import { useEffect, useRef, useState } from 'react';
import ArticleInput from './ArticleInput';
import RunView from './RunView';
import { getSharedAssessment } from '../../api/client';
import type { Claim, RunProgress, SharedAssessment, SharedClaim } from '../../types/grounnel';

// Same interval as usePollGrounnelStatus — a shared link opened mid-run is the same run, so it
// should advance at the same rate rather than sitting still until someone reloads.
const POLL_INTERVAL_MS = 5000;

// A shared claim carries no id (core 019 FR-009 keeps internal identifiers out) and no citations
// (core never persisted them), so both are synthesised. Position is a stable key for one
// assessment; a shared page therefore shows no inline citation numbers where a live run does.
function toClaim(claim: SharedClaim, index: number, runStatus: SharedAssessment['status']): Claim {
  const unfinished = runStatus === 'extracting' || runStatus === 'verifying';
  return {
    id: `shared-${index}`,
    text: claim.text,
    // From the RUN's status, not the verdict: on a run still verifying, a claim with no verdict is
    // pending, not failed.
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

function toRunProgress(assessment: SharedAssessment): RunProgress {
  const claims = assessment.claims.map((c, i) => toClaim(c, i, assessment.status));
  const ended = assessment.completedAt ? Date.parse(assessment.completedAt) : Date.now();
  const started = Date.parse(assessment.createdAt);
  return {
    status: assessment.status,
    claims,
    progress: { checked: claims.filter((c) => c.status !== 'pending').length, total: claims.length },
    // Not carried by the shared shape, so a shared view of a capped run omits that warning.
    caps_hit: false,
    elapsed_seconds: Number.isNaN(started) ? null : Math.round((ended - started) / 1000),
  };
}

export default function SharedAssessmentPage({ token }: { token: string }) {
  const [assessment, setAssessment] = useState<SharedAssessment | null>(null);
  const [failed, setFailed] = useState(false);

  // Mirrors usePollGrounnelStatus: interval first, then an immediate poll, so a run that is
  // already finished can stop the timer from inside that first call.
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    // try/catch, never `await ….catch()` (AGENTS.md Rule 11).
    const load = async () => {
      try {
        const data: SharedAssessment = await getSharedAssessment(token);
        if (cancelled) return;
        loaded.current = true;
        setAssessment(data);
        if (data.status === 'done' || data.status === 'failed') stop();
      } catch {
        if (cancelled) return;
        // A first load that fails is a dead link: report it and STOP. Without this the timer runs
        // for the life of the tab — 720 requests an hour against a 120/hour limit, which locks the
        // viewer out of every valid shared link too.
        if (!loaded.current) {
          setFailed(true);
          stop();
          return;
        }
        // Once a result is on screen, a transient error must not replace it with an error page,
        // and polling continues so the next tick can recover.
      }
    };

    timer = setInterval(load, POLL_INTERVAL_MS);
    void load();
    return () => {
      cancelled = true;
      stop();
    };
  }, [token]);

  if (failed && !assessment) {
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
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-base-content/60">Loading…</div>
    );
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Grounnel</h1>
          <p className="text-base-content/70">
            Paste text below to check its claims against the open web.
          </p>
        </div>

        <ArticleInput onSubmit={() => {}} disabled initialText={assessment.text} readOnly />

        <RunView articleText={assessment.text} status={toRunProgress(assessment)} />
      </div>
    </div>
  );
}
