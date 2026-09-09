import { useState } from 'react';

interface ArticleInputProps {
  onSubmit: (text: string) => void;
  disabled: boolean;
  /** Pre-fills the box — a restored run, or the text behind a shared link. */
  initialText?: string;
  /** A finished run someone else is reading: the text is shown, never edited, and cannot be sent. */
  readOnly?: boolean;
}

export default function ArticleInput({
  onSubmit,
  disabled,
  initialText = '',
  readOnly = false,
}: ArticleInputProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side rejection of empty/whitespace-only text before any request (FR-002).
    if (text.trim().length === 0) {
      setError('Paste some text to fact-check.');
      return;
    }
    setError(null);
    onSubmit(text);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        className="textarea textarea-bordered min-h-48 h-48 w-full resize-y"
        placeholder="Paste an article or claim-heavy text to fact-check..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
        disabled={disabled || readOnly}
      />
      {error && <div className="alert alert-error text-sm py-2">{error}</div>}
      {!readOnly && (
      <button type="submit" className="btn btn-primary w-full" disabled={disabled}>
        {disabled ? (
          <>
            <span className="loading loading-spinner loading-sm" />
            Checking...
          </>
        ) : (
          'Run fact-check'
        )}
      </button>
      )}
    </form>
  );
}
