import { useCallback, useState } from 'react';
import { submitGrounnelText } from '../api/client';
import usePollGrounnelStatus from './usePollGrounnelStatus';

interface GrounnelRunState {
  runId: string | null;
  error: string | null;
}

/**
 * Owns { runId, status, error } for a Grounnel run. Resubmission (FR-013): clearing runId
 * before the new id arrives lets usePollGrounnelStatus's own runId-keyed effect tear down the
 * previous interval and reset status, so a new run's state always replaces (never merges with)
 * the previous one.
 */
export default function useGrounnelRun() {
  const [state, setState] = useState<GrounnelRunState>({ runId: null, error: null });
  const { status } = usePollGrounnelStatus({ runId: state.runId });

  const submit = useCallback(async (text: string) => {
    setState({ runId: null, error: null });
    try {
      const result = await submitGrounnelText(text);
      setState({ runId: result.id, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit text';
      setState({ runId: null, error: message });
    }
  }, []);

  const dismissError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Run-level failure (FR-012's run-level half, spec.md's "run status becomes failed" edge
  // case) surfaces as an error too, not just submission failures.
  const runLevelError = status?.status === 'failed' ? 'The fact-check run failed.' : null;

  return {
    runId: state.runId,
    status,
    error: state.error ?? runLevelError,
    submit,
    dismissError,
  };
}
