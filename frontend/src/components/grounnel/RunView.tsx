import ArticleScores from './ArticleScores';
import ClaimSourceList from './ClaimSourceList';
import GrounnelProgress from './GrounnelProgress';
import HighlightedArticle from './HighlightedArticle';
import type { RunProgress } from '../../types/grounnel';

// The one rendering of a run, live or shared. A shared link is the same page the person who ran it
// saw, not a second presentation of the same data — so both paths mount this.
export default function RunView({
  articleText,
  status,
}: {
  articleText: string;
  status: RunProgress | null;
}) {
  const claims = status?.claims ?? [];
  return (
    <>
      <GrounnelProgress status={status} articleText={articleText} />
      {/* Finished runs only: mid-run the numbers swing on every claim, and a failed run scores
          what it happened to finish rather than what the article says. */}
      {status?.status === 'done' && <ArticleScores claims={claims} />}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <HighlightedArticle articleText={articleText} claims={claims} />
        </div>
      </div>
      <ClaimSourceList articleText={articleText} claims={claims} />
    </>
  );
}
