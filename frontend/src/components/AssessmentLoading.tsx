import usePollAssessment from '../hooks/usePollAssessment';

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

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          {timedOut ? (
            <>
              <h2 className="text-2xl font-bold text-warning mb-4">
                Taking longer than expected
              </h2>
              <p className="text-base-content/70 mb-6">
                The analysis is still running. You can wait or start a new reflection.
              </p>
              <button className="btn btn-primary" onClick={onRetry}>
                Try Again
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <span className="loading loading-spinner loading-lg text-primary" />
              <div>
                <h2 className="text-2xl font-bold mb-2">Analyzing your responses</h2>
                <p className="text-base-content/60">
                  Detecting cognitive biases in your reasoning...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
