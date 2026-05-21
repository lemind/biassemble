import usePollAssessment from '../hooks/usePollAssessment';
import LoadingFallback from './common/LoadingFallback';

interface AssessmentLoadingProps {
  sessionId: string;
  onReady: () => void;
  onError: (message: string) => void;
  onRetry: () => void;
}

export default function AssessmentLoading({
  sessionId,
  onReady,
  onError,
  onRetry,
}: AssessmentLoadingProps) {
  const { timedOut } = usePollAssessment({ sessionId, onReady, onError });

  if (timedOut) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-warning mb-4">
              Taking longer than expected
            </h2>
            <p className="text-base-content/70 mb-6">
              The analysis is still running. You can wait or start a new reflection.
            </p>
            <button className="btn btn-primary" onClick={onRetry}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <LoadingFallback title="Analyzing your responses" subtitle="Detecting cognitive biases in your reasoning..." />;
}
