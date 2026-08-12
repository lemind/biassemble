import type { GrounnelStatusOutput } from '../../types/grounnel';

interface GrounnelProgressProps {
  status: GrounnelStatusOutput | null;
}

const SOFT_STALL_THRESHOLD_SECONDS = 60;

// Rendered only once a run exists (`runId` set) — GrounnelApp gates that, this component just
// distinguishes "no status yet" (indeterminate) from "status arrived" (numeric) within that.
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
    <div role="status" className="flex flex-col gap-1 text-sm">
      <div className="flex items-center gap-2">
        <span className={isTerminal ? '' : 'animate-pulse'}>
          {checked} / {total} claims checked
        </span>
        {!isTerminal && <span className="loading loading-spinner loading-xs" />}
      </div>
      {status.caps_hit && (
        <p className="text-warning">Results are partial — the claim limit for this run was reached.</p>
      )}
      {isStalled && (
        <p className="text-base-content/60">This is taking longer than usual…</p>
      )}
    </div>
  );
}
