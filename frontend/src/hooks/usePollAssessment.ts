import { useState, useEffect, useRef } from 'react';
import { getSession } from '../api/client';
import type { SessionStatusResponse } from '../types/api';

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 30_000;

interface UsePollAssessmentOptions {
  sessionId: string;
  onReady: () => void;
  onError: (message: string) => void;
}

export default function usePollAssessment({
  sessionId,
  onReady,
  onError,
}: UsePollAssessmentOptions) {
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    const pollSessionStatus = async () => {
      try {
        const result: SessionStatusResponse = await getSession(sessionId);
        if (result.assessmentReady) {
          onReadyRef.current();
          stopPolling();
        }
      } catch {
        // Swallow — keep polling
      }
    };

    const stopPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    intervalRef.current = setInterval(pollSessionStatus, POLL_INTERVAL_MS);
    pollSessionStatus();

    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
      onErrorRef.current('Assessment generation is taking longer than expected. Please try again.');
      stopPolling();
    }, TIMEOUT_MS);

    return stopPolling;
  }, [sessionId]);

  return { timedOut };
}