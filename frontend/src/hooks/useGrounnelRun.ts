import { useCallback, useState } from 'react';
import { submitGrounnelText } from '../api/client';
import usePollGrounnelStatus from './usePollGrounnelStatus';

interface GrounnelRunState {
  runId: string | null;
  error: string | null;
  submitting: boolean;
}

/**
 * Owns { runId, status, error } for a Grounnel run. Resubmission (FR-013): clearing runId
 * before the new id arrives lets usePollGrounnelStatus's own runId-keyed effect tear down the
 * previous interval and reset status, so a new run's state always replaces (never merges with)
 * the previous one.
 */
export default function useGrounnelRun(initialRunId: string | null = null) {
  const [state, setState] = useState<GrounnelRunState>({
    runId: initialRunId,
    error: null,
    submitting: false,
  });
  const { status } = usePollGrounnelStatus({ runId: state.runId });

  const submit = useCallback(async (text: string) => {
    setState({ runId: null, error: null, submitting: true });
    try {
      const result = await submitGrounnelText(text);
      setState({ runId: result.id, error: null, submitting: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit text';
      setState({ runId: null, error: message, submitting: false });
    }
  }, []);

  const dismissError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Run-level failure (FR-012's run-level half, spec.md's "run status becomes failed" edge
  // case) surfaces as an error too, not just submission failures.
  const runLevelError = status?.status === 'failed' ? 'The fact-check run failed.' : null;

  // Revised 2026-08-12 (explicit user ask — reverses the earlier FR-013 reading in T018): the
  // Run button must stay disabled for the ENTIRE run, not just the initial POST — submitting a
  // second run while the first is still extracting/verifying was confusing in practice (results
  // from two overlapping runs could appear to blend together in the UI). `submit()` still tears
  // down any previous poll first, so this is just gating the button, not a correctness fix.
  // `status` stays null for the window between runId arriving and the first poll response
  // landing (usePollGrounnelStatus's own currentStatus derivation) — that window is still "in
  // flight", not terminal, so it's gated on `state.runId` being set, not on `status` existing.
  const isTerminal = !state.runId || status?.status === 'done' || status?.status === 'failed';
  return {
    runId: state.runId,
    status,
    error: state.error ?? runLevelError,
    isRunInFlight: state.submitting || !isTerminal,
    submit,
    dismissError,
  };
}
