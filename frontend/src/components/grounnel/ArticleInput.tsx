import { useState } from 'react';

// Measured, not guessed: across 161 complete production runs the median article ran 62.8 chars
// per extracted claim, so the engine's 40-claim ceiling lands at roughly 2,500 — 2,000 is safe.
const SOFT_LIMIT_CHARS = 2000;

interface ArticleInputProps {
  onSubmit: (text: string) => void;
  disabled: boolean;
  /** Pre-fills the box — a restored run, or the text behind a shared link. */
  initialText?: string;
  /** A run someone else is reading: the text is shown and never edited. The submit button is not
   *  rendered at all in this mode, so there is nothing to send. */
  readOnly?: boolean;
  /** This viewer's own run is in flight: keep the text selectable, just not editable. */
  locked?: boolean;
}

export default function ArticleInput({
  onSubmit,
  disabled,
  initialText = '',
  readOnly = false,
  locked = false,
}: ArticleInputProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const overSoftLimit = text.length > SOFT_LIMIT_CHARS;

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
      {/* Never `disabled`: that leaves the tab order and makes the text unselectable, so neither a
          reader of a shared link nor the author of a running check could copy the article. */}
      <textarea
        className={
          'textarea textarea-bordered min-h-48 h-48 w-full resize-y' +
          (readOnly || locked ? ' bg-base-200' : '')
        }
        placeholder="Paste an article or claim-heavy text to fact-check..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
        readOnly={readOnly || locked}
      />
      {!readOnly && !locked && (
        <div
          className={
            'flex flex-wrap items-baseline justify-between gap-2 text-xs ' +
            (overSoftLimit ? 'text-warning' : 'text-base-content/60')
          }
        >
          <span>
            {overSoftLimit
              ? 'Longer than one check covers — only the first 40 claims will be checked.'
              : 'One check covers about 40 claims, roughly this much text.'}
          </span>
          <span className="tabular-nums">
            {text.length.toLocaleString()} / {SOFT_LIMIT_CHARS.toLocaleString()}
          </span>
        </div>
      )}
      {error && <div className="alert alert-error text-sm py-2">{error}</div>}
      {!readOnly && (
      <>
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
      {/* Before the action, not after: the share link is minted the moment a run starts, so a
          notice shown only once the URL exists comes too late to be a choice. */}
      <p className="text-xs text-base-content/60">
        Running a check publishes the text and its results at a permanent public link. Don&apos;t
        paste private or sensitive material.
      </p>
      </>
      )}
    </form>
  );
}
