import { useEffect, useState } from 'react';
import useGrounnelRun from '../../hooks/useGrounnelRun';
import ArticleInput from './ArticleInput';
import RunView from './RunView';


export default function GrounnelApp() {
  const { runId, shareToken, status, error, isRunInFlight, submit, dismissError } = useGrounnelRun();
  // Kept separately from useGrounnelRun's own state — the hook only tracks the run's id/status/
  // error, not the submitted text itself, which HighlightedArticle needs to redisplay (FR-006).
  const [articleText, setArticleText] = useState('');

  // The address bar IS the share link. replaceState, not push: the empty page is not somewhere to
  // go back to, and the token exists from creation, so this lands as soon as the run starts.
  //
  // This is why `/` no longer restores the previous run (it did under T018, via localStorage): the
  // URL now persists a run across reloads and tabs, and does it better — it survives the tab
  // closing and can be handed to someone else. Restoring as well made `/` un-reachable, because a
  // stored run immediately rewrote the URL back to itself and there was no way to start a new check.
  useEffect(() => {
    if (!shareToken) return;
    const url = `/check/${shareToken}`;
    if (window.location.pathname !== url) window.history.replaceState(null, '', url);
  }, [shareToken]);

  const handleSubmit = (text: string) => {
    setArticleText(text);
    submit(text);
  };

  return (
    <div className="px-4 py-12">
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

        {/* `locked`, not `disabled`: the submit lock belongs on the button (ArticleInput sets it
            there), and a disabled textarea makes the user's own pasted article unselectable. */}
        <ArticleInput
          onSubmit={handleSubmit}
          disabled={isRunInFlight}
          locked={isRunInFlight}
        />

        {error && (
          <div className="alert alert-error text-sm py-2">
            {error}
            <button className="btn btn-ghost btn-xs ml-2" onClick={dismissError}>
              Dismiss
            </button>
          </div>
        )}

        {runId && <RunView articleText={articleText} status={status} />}
      </div>
    </div>
  );
}
