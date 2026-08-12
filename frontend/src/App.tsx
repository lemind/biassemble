import { Suspense, lazy } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingFallback from './components/common/LoadingFallback';
import BiassembleLayout from './components/common/BiassembleLayout';
import useReflectionFlow from './hooks/useReflectionFlow';
import { isGrounnelRoute } from './lib/routes';

const LandingPage = lazy(() => import('./components/LandingPage'));
const QAFlow = lazy(() => import('./components/QAFlow'));
const AssessmentLoading = lazy(() => import('./components/AssessmentLoading'));
const ResultsView = lazy(() => import('./components/ResultsView'));
const GrounnelApp = lazy(() => import('./components/grounnel/GrounnelApp'));

export default function App() {
  // useReflectionFlow must run unconditionally (Rules of Hooks) even on /grounnel, where its
  // state is simply unused — an early return before this call would call the hook
  // conditionally, which React (correctly) rejects.
  const {
    phase,
    sessionId,
    questions,
    error,
    startSession,
    completeQA,
    handleError,
    showResults,
    reset,
    clearError,
  } = useReflectionFlow();

  if (isGrounnelRoute()) {
    return (
      <ErrorBoundary>
        <BiassembleLayout>
          <Suspense fallback={<LoadingFallback />}>
            <GrounnelApp />
          </Suspense>
        </BiassembleLayout>
      </ErrorBoundary>
    );
  }

  if (phase === 'qa' && sessionId) {
    return (
      <ErrorBoundary>
        <BiassembleLayout>
          <Suspense fallback={<LoadingFallback />}>
            <QAFlow
              sessionId={sessionId}
              questions={questions}
              onComplete={completeQA}
            />
          </Suspense>
        </BiassembleLayout>
      </ErrorBoundary>
    );
  }

  if (phase === 'assessing' && sessionId) {
    return (
      <ErrorBoundary>
        <BiassembleLayout>
          <Suspense fallback={<LoadingFallback />}>
            <AssessmentLoading
              sessionId={sessionId}
              onReady={showResults}
              onError={handleError}
              onRetry={reset}
            />
          </Suspense>
        </BiassembleLayout>
      </ErrorBoundary>
    );
  }

  if (phase === 'results' && sessionId) {
    return (
      <ErrorBoundary>
        <BiassembleLayout>
          <Suspense fallback={<LoadingFallback />}>
            <ResultsView
              sessionId={sessionId}
              onReset={reset}
              onError={handleError}
            />
          </Suspense>
        </BiassembleLayout>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <BiassembleLayout>
        <LandingPage
          error={error}
          onSessionCreated={startSession}
          onError={handleError}
          onDismissError={clearError}
        />
      </BiassembleLayout>
    </ErrorBoundary>
  );
}
