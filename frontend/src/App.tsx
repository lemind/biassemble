import { Suspense, lazy, useEffect } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingFallback from './components/common/LoadingFallback';
import BiassembleLayout from './components/common/BiassembleLayout';
import useReflectionFlow from './hooks/useReflectionFlow';
import { resolveBrand } from './lib/brand';
import { currentRoute } from './lib/routes';

const LandingPage = lazy(() => import('./components/LandingPage'));
const QAFlow = lazy(() => import('./components/QAFlow'));
const AssessmentLoading = lazy(() => import('./components/AssessmentLoading'));
const ResultsView = lazy(() => import('./components/ResultsView'));
const GrounnelApp = lazy(() => import('./components/grounnel/GrounnelApp'));
const AboutPage = lazy(() => import('./components/AboutPage'));

function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-base-content/70">
        <a className="link" href="/">
          Go back
        </a>
      </p>
    </div>
  );
}

export default function App() {
  // Brand is resolved from the hostname, the page from the path, and the two never consult each
  // other. Nav links are plain <a> full-reloads, so resolving once at mount is enough.
  const brand = resolveBrand();
  const route = currentRoute(brand.id);

  useEffect(() => {
    document.title = `${brand.name} — ${brand.tagline}`;
  }, [brand]);

  // `/grounnel` on the Grounnel host is the same page as `/`; normalise the URL without a flash,
  // since the branch below already renders the tool either way.
  useEffect(() => {
    if (route.redirectTo) window.location.replace(route.redirectTo);
  }, [route.redirectTo]);

  // Must run unconditionally (Rules of Hooks) even when the route never reaches the reflection
  // flow, where its state is simply unused.
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

  function page() {
    if (route.page === 'tool') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <GrounnelApp />
        </Suspense>
      );
    }

    if (route.page === 'about') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <AboutPage brand={brand} />
        </Suspense>
      );
    }

    // Stats (Phase 3) and the shared assessment (Phase 4) are routed but not built yet; they
    // render not-found until their own phase lands.
    if (route.page !== 'reflection') return <NotFound />;

    if (phase === 'qa' && sessionId) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <QAFlow sessionId={sessionId} questions={questions} onComplete={completeQA} />
        </Suspense>
      );
    }

    if (phase === 'assessing' && sessionId) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <AssessmentLoading
            sessionId={sessionId}
            onReady={showResults}
            onError={handleError}
            onRetry={reset}
          />
        </Suspense>
      );
    }

    if (phase === 'results' && sessionId) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ResultsView sessionId={sessionId} onReset={reset} onError={handleError} />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<LoadingFallback />}>
        <LandingPage
          error={error}
          onSessionCreated={startSession}
          onError={handleError}
          onDismissError={clearError}
        />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <BiassembleLayout brand={brand} activePath={window.location.pathname}>
        {page()}
      </BiassembleLayout>
    </ErrorBoundary>
  );
}
