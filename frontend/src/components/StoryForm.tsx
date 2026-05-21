import { useState } from 'react';
import { z } from 'zod';
import { submitStory } from '../api/client';
import type { SubmitStoryResponse } from '../types/api';

const STORY_MIN_LENGTH = 50;
const STORY_MAX_LENGTH = 3000;

const storySchema = z.object({
  story: z
    .string()
    .min(STORY_MIN_LENGTH, `Story must be at least ${STORY_MIN_LENGTH} characters`)
    .max(STORY_MAX_LENGTH, `Story must not exceed ${STORY_MAX_LENGTH} characters`),
});

interface StoryFormProps {
  onSuccess: (sessionId: string, questions: string[]) => void;
  onError: (message: string) => void;
}

export default function StoryForm({ onSuccess, onError }: StoryFormProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = storySchema.safeParse({ story: text });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const result: SubmitStoryResponse = await submitStory(text);
      onSuccess(result.sessionId, result.questions);
    } catch (err) {
      const bodyMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      onError(bodyMsg ?? (err instanceof Error ? err.message : 'Failed to submit story'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        className="textarea textarea-bordered min-h-40 h-40 w-full resize-y"
        placeholder="Describe a personal situation you've been thinking about recently. What happened? How did you react? What concerns you about it?"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
      />
      {error && (
        <div className="alert alert-error text-sm py-2">{error}</div>
      )}
      <div className="flex justify-between items-center text-sm text-base-content/60">
        <span>{text.length} / {STORY_MAX_LENGTH}</span>
      </div>
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <span className="loading loading-spinner loading-sm" />
            Submitting...
          </>
        ) : (
          'Begin Reflection'
        )}
      </button>
    </form>
  );
}
