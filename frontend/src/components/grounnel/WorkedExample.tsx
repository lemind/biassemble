import { useState } from 'react';
import HighlightedArticle from './HighlightedArticle';
import ClaimSourceList from './ClaimSourceList';
import workedExample from '../../data/workedExample';

// A frozen real run, not a live one — no API call per visitor, and nothing here can break. Lives
// at the end of About, not on the tool page: it is reference material, and in the middle of the
// product it sat between a person and the thing they came to do. Regenerated from the database,
// never hand-edited (see the fixture's own header).
export default function WorkedExample() {
  const [open, setOpen] = useState(false);
  const { text, claims, ranAt, promptVersionExtract, promptVersionVerify } = workedExample;
  const contradicted = claims.filter((c) => c.verdict === 'contradicted').length;

  return (
    <section>
      <h2 className="text-sm uppercase tracking-widest text-base-content/50">A finished check</h2>
      <p className="mt-4 leading-relaxed text-base-content/80">
        A real run over a short travel diary — {claims.length} claims, {contradicted} contradicted by
        its sources.
      </p>
      <button
        type="button"
        className="link mt-2 text-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? 'Hide it' : 'Show it'}
      </button>

      {open && (
        <div className="mt-6 border-t border-base-300 pt-6">
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
