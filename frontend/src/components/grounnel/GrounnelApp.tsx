import { useState } from 'react';
import useGrounnelRun from '../../hooks/useGrounnelRun';
import ArticleInput from './ArticleInput';
import HighlightedArticle from './HighlightedArticle';

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
    <div className="min-h-screen bg-base-200 px-4 py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Grounnel</h1>
          <p className="text-base-content/70">
            Paste text below to check its claims against the open web.
          </p>
        </div>

        <ArticleInput onSubmit={handleSubmit} disabled={isRunInFlight} />

        {error && (
          <div className="alert alert-error text-sm py-2">
            {error}
            <button className="btn btn-ghost btn-xs ml-2" onClick={dismissError}>
              Dismiss
            </button>
          </div>
        )}

        {runId && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <HighlightedArticle articleText={articleText} claims={status?.claims ?? []} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
