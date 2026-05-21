import { useState } from 'react';
import type { SubmitAnswerResponse } from '../types/api';
import { submitAnswer } from '../api/client';

interface QAFlowProps {
  sessionId: string;
  questions: string[];
  onComplete: () => void;
  onError: (message: string) => void;
}

export default function QAFlow({ sessionId, questions, onComplete, onError }: QAFlowProps) {
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLastQuestion = currentIndex >= questions.length - 1;
  const progressText = `Question ${currentIndex + 1} of ${questions.length}`;

  const updateAnswer = (text: string) => {
    const next = [...answers];
    next[currentIndex] = text;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    const text = answers[currentIndex].trim();
    if (!text) return;

    setError(null);
    setSubmitting(true);
    try {
      const result: SubmitAnswerResponse = await submitAnswer(sessionId, text);

      if (result.assessmentPending) {
        onComplete();
        return;
      }

      setCurrentIndex((i) => i + 1);
    } catch (err) {
      const bodyMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(bodyMsg ?? (err instanceof Error ? err.message : 'Failed to submit answer'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full max-w-2xl">
        <div className="card bg-base-100 w-full shadow-2xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-2">Reflection Questions</h2>
            <p className="text-base-content/60 mb-6">
              Answer each question thoughtfully. Your responses help identify cognitive biases in your reasoning.
            </p>

            {error && (
              <div className="alert alert-error text-sm py-2 mb-4">
                {error}
                <button className="btn btn-ghost btn-xs ml-2" onClick={() => setError(null)}>
                  Dismiss
                </button>
              </div>
            )}

            {questions.map((question, idx) => (
              <div
                key={idx}
                className={`mb-4 p-4 rounded-box border ${
                  idx === currentIndex
                    ? 'border-primary bg-primary/5'
                    : idx < currentIndex
                      ? 'border-success/30 bg-success/5'
                      : 'border-base-300 bg-base-200/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`badge ${
                      idx === currentIndex
                        ? 'badge-primary'
                        : idx < currentIndex
                          ? 'badge-success'
                          : 'badge-ghost'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium mb-2">{question}</p>
                    {idx < currentIndex ? (
                      <p className="text-sm text-success italic">
                        Answered
                      </p>
                    ) : idx === currentIndex ? (
                      <>
                        <textarea
                          className="textarea textarea-bordered w-full resize-y mt-1"
                          rows={4}
                          placeholder="Type your answer..."
                          value={answers[idx]}
                          onChange={(e) => updateAnswer(e.target.value)}
                        />
                      </>
                    ) : (
                      <p className="text-sm text-base-content/40 italic">
                        Waiting
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-base-content/60">{progressText}</span>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !answers[currentIndex].trim()}
              >
                {submitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Submitting...
                  </>
                ) : isLastQuestion ? (
                  'Complete Reflection'
                ) : (
                  'Submit & Next'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}