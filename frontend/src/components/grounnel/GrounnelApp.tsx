import { useEffect, useState } from 'react';
import useGrounnelRun from '../../hooks/useGrounnelRun';
import { resolveBrand } from '../../lib/brand';
import { applyPageMeta } from '../../lib/seo';
import ArticleInput from './ArticleInput';
import RunView from './RunView';

// Per-browser, not per-tab: a notice you dismissed should stay dismissed on the next visit.
const ALPHA_NOTICE_KEY = 'grounnel.alphaNoticeDismissed';


export default function GrounnelApp() {
  const { runId, shareToken, status, error, isRunInFlight, submit, dismissError } = useGrounnelRun();
  // Kept separately from useGrounnelRun's own state — the hook only tracks the run's id/status/
  // error, not the submitted text itself, which HighlightedArticle needs to redisplay (FR-006).
  const [articleText, setArticleText] = useState('');
  const [alphaNotice, setAlphaNotice] = useState(() => {
    try {
      return localStorage.getItem(ALPHA_NOTICE_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const dismissAlphaNotice = () => {
    setAlphaNotice(false);
    try {
      localStorage.setItem(ALPHA_NOTICE_KEY, '1');
    } catch {
      // Storage blocked — it just comes back next visit, which is not worth failing the click over.
    }
  };

  // The address bar IS the share link. replaceState, not push: the empty page is not somewhere
  // to go back to, which is also why `/` no longer restores the previous run.
  useEffect(() => {
    if (!shareToken) return;
    const url = `/check/${shareToken}`;
    if (window.location.pathname === url) return;
    window.history.replaceState(null, '', url);
    // App resolved the route at mount and never re-renders for this, so the head would keep the
    // homepage title and canonical on the one URL that must carry neither.
    applyPageMeta(resolveBrand(), 'check');
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

        {alphaNotice && (
          <div className="alert alert-info items-start py-3 text-sm">
            <span>
              <span className="font-semibold">Alpha.</span> One check covers up to 40 claims —
              about 2,000 characters, or 350 words. Longer texts are checked in part, so run them
              a few paragraphs at a time.
            </span>
            <button
              className="btn btn-ghost btn-xs"
              aria-label="Dismiss"
              onClick={dismissAlphaNotice}
            >
              ✕
            </button>
          </div>
        )}

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
