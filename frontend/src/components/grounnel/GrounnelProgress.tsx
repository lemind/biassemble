import { VERDICT_DOT_CLASS } from '../../lib/verdictStyle';
import type { Claim, GrounnelStatusOutput } from '../../types/grounnel';

interface GrounnelProgressProps {
  status: GrounnelStatusOutput | null;
}

const SOFT_STALL_THRESHOLD_SECONDS = 60;

// One dot per claim: spinning while `pending`, solid verdict color once `done`, a dashed ring if
// verification itself failed (distinct from a real verdict, FR-012).
function ClaimDot({ claim }: { claim: Claim }) {
  if (claim.status === 'pending') {
    return (
      <span
        aria-hidden="true"
        title="Checking…"
        className="loading loading-spinner loading-xs text-base-content/40"
      />
    );
  }
  if (claim.status === 'failed' || !claim.verdict) {
    return (
      <span
        aria-hidden="true"
        title="Verification failed"
        className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-base-content/40"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      title={claim.verdict}
      className={`inline-block h-2.5 w-2.5 rounded-full ${VERDICT_DOT_CLASS[claim.verdict]}`}
    />
  );
}

// Rendered only once a run exists (`runId` set) — GrounnelApp gates that, this component just
// distinguishes "no status yet" (indeterminate) from "status arrived" (numeric + per-claim dots).
export default function GrounnelProgress({ status }: GrounnelProgressProps) {
  if (!status) {
    return (
      <div role="status" className="flex items-center gap-2 text-sm text-base-content/70">
        <span className="loading loading-dots loading-sm" />
        Finding claims…
      </div>
    );
  }

  const isTerminal = status.status === 'done' || status.status === 'failed';
  const { checked, total } = status.progress;
  const isStalled =
    !isTerminal &&
    status.elapsed_seconds !== null &&
    status.elapsed_seconds > SOFT_STALL_THRESHOLD_SECONDS;

  return (
    <div role="status" className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className={isTerminal ? '' : 'animate-pulse'}>
          {checked} / {total} claims checked
        </span>
        {!isTerminal && <span className="loading loading-spinner loading-xs" />}
      </div>
      {status.claims.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {status.claims.map((claim) => (
            <ClaimDot key={claim.id} claim={claim} />
          ))}
        </div>
      )}
      {status.caps_hit && (
        <p className="text-warning">Results are partial — the claim limit for this run was reached.</p>
      )}
      {isStalled && (
        <p className="text-base-content/60">This is taking longer than usual…</p>
      )}
    </div>
  );
}
