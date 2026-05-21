import { Suspense, lazy } from 'react';
import LoadingFallback from './common/LoadingFallback';

const StoryForm = lazy(() => import('./StoryForm'));

interface LandingPageProps {
  error: string | null;
  onSessionCreated: (sessionId: string, questions: string[]) => void;
  onError: (message: string) => void;
  onDismissError: () => void;
}

export default function LandingPage({
  error,
  onSessionCreated,
  onError,
  onDismissError,
}: LandingPageProps) {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse gap-12">
        <div className="text-center lg:text-left max-w-lg">
          <h1 className="text-5xl font-bold">Biassemble</h1>
          <p className="py-6 text-lg text-base-content/80">
            Discover cognitive biases in your own reasoning. Write a personal situation,
            answer AI-guided questions, and get insights that help you see things differently.
          </p>
        </div>
        <div className="card bg-base-100 w-full max-w-md shrink-0 shadow-2xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-2">Share your story</h2>
            {error && (
              <div className="alert alert-error text-sm py-2 mb-2">
                {error}
                <button
                  className="btn btn-ghost btn-xs ml-2"
                  onClick={onDismissError}
                >
                  Dismiss
                </button>
              </div>
            )}
            <Suspense fallback={<LoadingFallback />}>
              <StoryForm onSuccess={onSessionCreated} onError={onError} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}