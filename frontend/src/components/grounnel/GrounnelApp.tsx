import { useState } from 'react';
import useGrounnelRun from '../../hooks/useGrounnelRun';
import ArticleInput from './ArticleInput';
import ClaimSourceList from './ClaimSourceList';
import GrounnelProgress from './GrounnelProgress';
import HighlightedArticle from './HighlightedArticle';
import WorkedExample from './WorkedExample';

export default function GrounnelApp() {
  const { runId, status, error, isRunInFlight, submit, dismissError } = useGrounnelRun();
  // Kept separately from useGrounnelRun's own state — the hook only tracks the run's id/status/
  // error, not the submitted text itself, which HighlightedArticle needs to redisplay (FR-006).
  const [articleText, setArticleText] = useState('');

  const handleSubmit = (text: string) => {
    setArticleText(text);
    submit(text);
  };

  return (
    <div className="h-full bg-base-200 px-4 py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Grounnel</h1>
          <p className="text-base-content/70">
            Paste text below to check its claims against the open web.
          </p>
        </div>

        <div className="collapse collapse-arrow border border-base-300 bg-base-100">
          {/* No defaultChecked — collapsed by default, same collapse pattern as ResultsView.tsx */}
          <input type="checkbox" />
          <div className="collapse-title text-sm font-medium">What is Grounnel?</div>
          <div className="collapse-content text-sm text-base-content/70">
            <p>
              Grounnel checks factual claims in a piece of text against sources on the open web.
              Paste in an article or any claim-heavy text, and it extracts the individual factual
              claims, searches for evidence, and highlights each one by verdict — supported,
              contradicted, or unclear — so you can see at a glance what&apos;s actually backed by
              a source and what isn&apos;t.{' '}
              <a className="link" href="/about">
                More about how it works
              </a>
              .
            </p>
          </div>
        </div>

        <ArticleInput onSubmit={handleSubmit} disabled={isRunInFlight} />

        {!runId && <WorkedExample />}

        {error && (
          <div className="alert alert-error text-sm py-2">
            {error}
            <button className="btn btn-ghost btn-xs ml-2" onClick={dismissError}>
              Dismiss
            </button>
          </div>
        )}

        {runId && <GrounnelProgress status={status} articleText={articleText} />}

        {runId && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <HighlightedArticle articleText={articleText} claims={status?.claims ?? []} />
            </div>
          </div>
        )}

        {runId && <ClaimSourceList articleText={articleText} claims={status?.claims ?? []} />}
      </div>
    </div>
  );
}
