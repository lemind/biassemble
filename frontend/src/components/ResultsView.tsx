import { useEffect, useState } from 'react';
import { getResult } from '../api/client';
import type { ResultResponse } from '../types/api';

interface ResultsViewProps {
  sessionId: string;
  onReset: () => void;
  onError: (message: string) => void;
}

export default function ResultsView({ sessionId, onReset, onError }: ResultsViewProps) {
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAssessment = async () => {
      try {
        const data: ResultResponse = await getResult(sessionId);
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) {
          const bodyMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          onError(bodyMsg ?? (err instanceof Error ? err.message : 'Failed to load results'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAssessment();

    return () => {
      cancelled = true;
    };
  }, [sessionId, onError]);

  if (loading) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-error mb-4">
              Unable to load results
            </h2>
            <button className="btn btn-primary" onClick={onReset}>
              Start a New Reflection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-12">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="card bg-base-100 shadow-2xl mb-8">
          <div className="card-body">
            <h1 className="text-3xl font-bold mb-2">Your Cognitive Bias Assessment</h1>
            <p className="text-base-content/60 mb-6">
              Based on your story and responses, here are the cognitive biases detected.
            </p>

            {result.biases.map((bias, idx) => (
              <div key={idx} className="collapse collapse-arrow border border-base-300 mb-3">
                <input type="checkbox" defaultChecked={idx === 0} />
                <div className="collapse-title text-xl font-medium">
                  {bias.name}
                </div>
                <div className="collapse-content">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-base-content/70 mb-1">
                        What this means
                      </h4>
                      <p>{bias.explanation}</p>
                    </div>
                    <div className="bg-base-200 p-4 rounded-box">
                      <h4 className="font-semibold text-sm text-base-content/70 mb-1">
                        Connection to your story
                      </h4>
                      <p className="italic">{bias.storyConnection}</p>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-box border border-primary/20">
                      <h4 className="font-semibold text-sm text-primary/70 mb-1">
                        Alternative perspective
                      </h4>
                      <p>{bias.alternativePerspective}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-base-200 p-6 rounded-box mt-6">
              <h3 className="text-lg font-semibold mb-2">Reflection Prompt</h3>
              <p className="text-base-content/80 italic">
                {result.reflectionPrompt}
              </p>
            </div>

            <div className="mt-8 text-center">
              <button className="btn btn-primary btn-lg" onClick={onReset}>
                Start a New Reflection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}