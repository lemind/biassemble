import { useState } from 'react';
import HighlightedArticle from './HighlightedArticle';
import ClaimSourceList from './ClaimSourceList';
import workedExample from '../../data/workedExample';

// A frozen real run, not a live one — no API call per visitor, and it cannot break on the landing
// page. Regenerated from the database, never hand-edited (see the fixture's own header).
export default function WorkedExample() {
  const [open, setOpen] = useState(false);
  const { text, claims, ranAt, promptVersionExtract, promptVersionVerify } = workedExample;
  const contradicted = claims.filter((c) => c.verdict === 'contradicted').length;

  return (
    <section className="rounded-lg border border-base-300 bg-base-100">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          <span className="font-medium">See a finished check</span>
          <span className="block text-sm text-base-content/60">
            A real run over a short travel diary — {claims.length} claims, {contradicted} contradicted
            by its sources.
          </span>
        </span>
        <span aria-hidden className="text-base-content/50">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <div className="border-t border-base-300 p-4">
          <p className="mb-4 text-sm text-base-content/60">
            Output from an actual run on {ranAt.slice(0, 10)} (prompts {promptVersionExtract}/
            {promptVersionVerify}), trimmed to two paragraphs. The text was written for testing, so
            some of its errors are deliberate; the verdicts, passages and sources are exactly what
            the pipeline produced.
          </p>
          <HighlightedArticle articleText={text} claims={claims} />
          <div className="mt-4">
            <ClaimSourceList articleText={text} claims={claims} />
          </div>
        </div>
      )}
    </section>
  );
}
