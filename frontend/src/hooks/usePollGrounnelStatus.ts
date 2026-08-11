import { useEffect, useRef, useState } from 'react';
import { getGrounnelStatus } from '../api/client';
import type { GrounnelStatusOutput } from '../types/grounnel';

// 5s, not usePollAssessment's 2s — Grounnel is a longer, variable multi-claim process, not a
// single bounded call (ADR-002 §5, revised 2026-08-11). No fixed overall cutoff — Grounnel runs
// are polled until status reaches done/failed; GrounnelProgress shows a soft "taking longer than
// usual" note using started_at/elapsed_seconds instead (plan.md's Polling model).
const POLL_INTERVAL_MS = 5000;

interface UsePollGrounnelStatusOptions {
  runId: string | null;
}

export default function usePollGrounnelStatus({ runId }: UsePollGrounnelStatusOptions) {
  const [status, setStatus] = useState<GrounnelStatusOutput | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!runId) return;

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const result: GrounnelStatusOutput = await getGrounnelStatus(runId);
        if (cancelled) return;
        setStatus(result);
        if (result.status === 'done' || result.status === 'failed') {
          stopPolling();
        }
      } catch {
        // Swallow — transient fetch errors keep polling rather than surfacing immediately
        // (spec.md's edge case: "a status poll fails transiently").
      }
    };

    const stopPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    intervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    pollStatus();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [runId]);

  // Never show status belonging to a different (stale/previous) run — GrounnelStatusOutput.id
  // always equals the runId it was fetched for, so this is a pure derivation from existing
  // state, not a setState reset (avoids a synchronous setState-in-effect anti-pattern).
  const currentStatus = status && status.id === runId ? status : null;

  return { status: currentStatus };
}
