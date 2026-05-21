import { useState } from 'react';
import type { Phase } from '../types/ui';

interface ReflectionFlowState {
  phase: Phase;
  sessionId: string | null;
  questions: string[];
  error: string | null;
}

export default function useReflectionFlow() {
  const [state, setState] = useState<ReflectionFlowState>({
    phase: 'landing',
    sessionId: null,
    questions: [],
    error: null,
  });

  const startSession = (sessionId: string, questions: string[]) => {
    setState({ phase: 'qa', sessionId, questions, error: null });
  };

  const completeQA = () => {
    setState((prev) => ({ ...prev, phase: 'assessing', error: null }));
  };

  const handleError = (message: string) => {
    setState({ phase: 'landing', sessionId: null, questions: [], error: message });
  };

  const showResults = () => {
    setState((prev) => ({ ...prev, phase: 'results', error: null }));
  };

  const reset = () => {
    setState({ phase: 'landing', sessionId: null, questions: [], error: null });
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  return {
    phase: state.phase,
    sessionId: state.sessionId,
    questions: state.questions,
    error: state.error,
    startSession,
    completeQA,
    handleError,
    showResults,
    reset,
    clearError,
  };
}