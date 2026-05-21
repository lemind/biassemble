import { Suspense, lazy } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingFallback from './components/common/LoadingFallback';
import useReflectionFlow from './hooks/useReflectionFlow';

const LandingPage = lazy(() => import('./components/LandingPage'));
const QAFlow = lazy(() => import('./components/QAFlow'));
const AssessmentLoading = lazy(() => import('./components/AssessmentLoading'));
const ResultsView = lazy(() => import('./components/ResultsView'));

export default function App() {
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

  if (phase === 'qa' && sessionId) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <QAFlow
            sessionId={sessionId}
            questions={questions}
            onComplete={completeQA}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (phase === 'assessing' && sessionId) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <AssessmentLoading
            sessionId={sessionId}
            onReady={showResults}
            onError={handleError}
            onRetry={reset}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (phase === 'results' && sessionId) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <ResultsView
            sessionId={sessionId}
            onReset={reset}
            onError={handleError}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <LandingPage
        error={error}
        onSessionCreated={startSession}
        onError={handleError}
        onDismissError={clearError}
      />
    </ErrorBoundary>
  );
}