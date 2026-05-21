import { useState } from 'react';
import type { SubmitAnswersResponse } from '../types/api';
import { submitAnswers } from '../api/client';

interface QAFlowProps {
  sessionId: string;
  questions: string[];
  onComplete: () => void;
}

export default function QAFlow({ sessionId, questions, onComplete }: QAFlowProps) {
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFilled = answers.every((a) => a.trim().length > 0);

  const updateAnswer = (idx: number, text: string) => {
    const next = [...answers];
    next[idx] = text;
    setAnswers(next);
  };

  const handleSubmitAll = async () => {
    if (!allFilled) return;

    setError(null);
    setSubmitting(true);
    try {
      const result: SubmitAnswersResponse = await submitAnswers(sessionId, answers);
      if (result.assessmentPending) {
        onComplete();
      }
    } catch (err) {
      const bodyMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(bodyMsg ?? (err instanceof Error ? err.message : 'Failed to submit answers'));
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
              Answer all questions below. When you're ready, submit them all at once for analysis.
            </p>

            {error && (
              <div className="alert alert-error text-sm py-2 mb-4">
                {error}
                <button className="btn btn-ghost btn-xs ml-2" onClick={() => setError(null)}>
                  Dismiss
                </button>
              </div>
            )}

            <div className="space-y-6">
              {questions.map((question, idx) => (
                <div key={idx} className="p-4 rounded-box border border-base-300">
                  <div className="flex items-start gap-3">
                    <span className="badge badge-primary">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium mb-2">{question}</p>
                      <textarea
                        className="textarea textarea-bordered w-full resize-y mt-1"
                        rows={4}
                        placeholder="Type your answer..."
                        value={answers[idx]}
                        onChange={(e) => updateAnswer(idx, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                className="btn btn-primary"
                onClick={handleSubmitAll}
                disabled={submitting || !allFilled}
              >
                {submitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Submitting all answers...
                  </>
                ) : (
                  'Submit All Answers'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}