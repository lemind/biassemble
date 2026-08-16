import type { ReactNode } from 'react';
import { assignHomeSentence, matchClaimSpans, type Span } from '../../lib/matchClaimSpans';
import { numberCitations } from '../../lib/numberCitations';
import { VERDICT_DOT_CLASS } from '../../lib/verdictStyle';
import type { Claim, ClaimVerdict, GrounnelStatusOutput } from '../../types/grounnel';

interface GrounnelProgressProps {
  status: GrounnelStatusOutput | null;
  articleText: string;
}

const SOFT_STALL_THRESHOLD_SECONDS = 60;

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Used for the pending group only — spanned/resolved groups below already know they have a span
// by construction and link straight to `#claim-mark-<c.id>`. Points at the first member claim
// that actually has a matched span, since that's the only kind of claim `HighlightedArticle`
// gives a `#claim-mark-<id>` DOM id to; returns undefined when no pending claim has one yet.
function firstSpannedHref(claims: Claim[], spans: Map<string, Span | null>): string | undefined {
  const spanned = claims.find((c) => spans.get(c.id) != null);
  return spanned ? `#claim-mark-${spanned.id}` : undefined;
}

function PendingDot({ count, href }: { count: number; href?: string }) {
  const label = count > 1 ? `${count} claims checking…` : 'Checking…';
  const title = href ? `${label} — click to view` : label;
  const className = 'loading loading-spinner loading-xs text-base-content/40' + (href ? ' cursor-pointer' : '');
  return href ? (
    <a href={href} title={title} className={className} />
  ) : (
    <span aria-hidden="true" title={title} className={className} />
  );
}

const FAILED_DOT_CLASS = 'bg-base-content/40';

type VerdictKey = ClaimVerdict | 'failed';

// Shared by every grouping pass below so "what counts as failed" can't drift between them —
// a claim whose verification itself errored, or which resolved with no verdict at all.
function verdictKeyOf(claim: Claim): VerdictKey {
  return claim.status === 'failed' || !claim.verdict ? 'failed' : claim.verdict;
}

// One dot per DISTINCT verdict (or "failed") present — always solid-colored, whether or not
// matchClaimSpans could locate the claim in the article text. A dashed/outlined variant used to
// mark the "not located" case, but it read as "no info" at a glance (real user feedback,
// 2026-08-16) — every resolved claim now gets its verdict's real color; only where the dot links
// to varies (see `firstSpannedHref`/`unconfirmedHref`).
function ResultDot({ verdictKey, href }: { verdictKey: VerdictKey; href?: string }) {
  const label = verdictKey === 'failed' ? 'Verification failed' : verdictKey;
  const title = href ? `${label} — click to view` : label;
  const colorClass = verdictKey === 'failed' ? FAILED_DOT_CLASS : VERDICT_DOT_CLASS[verdictKey];
  const className = `inline-block h-2.5 w-2.5 rounded-full ${colorClass}` + (href ? ' cursor-pointer' : '');
  return href ? (
    <a href={href} title={title} className={className} />
  ) : (
    <span aria-hidden="true" title={title} className={className} />
  );
}

// Where an unspanned verdict-key group's dot should send a click: its first cited source's
// reference entry, if any claim in the group has one. A group with no citation either has nowhere
// valid to link to and renders as a plain, non-interactive dot.
function unconfirmedHref(claims: Claim[], claimNumbers: Map<string, number[]>): string | undefined {
  for (const claim of claims) {
    const numbers = claimNumbers.get(claim.id) ?? [];
    if (numbers.length > 0) return `#ref-${numbers[0]}`;
  }
  return undefined;
}

// One "how much of the article is checked" row, grouped by which sentence a claim belongs to —
// not one dot per claim. A sentence EXTRACT split into several atomic claims (T034/D-whatever
// compound-sentence case) that all resolve to the same visible highlighted text shouldn't draw 3
// identical dots for what's visually one colored chunk, and a claim that never got a highlight at
// all (matchClaimSpans returned null) shouldn't silently vanish from the count either — both fold
// into one dot per distinct verdict per sentence instead of one dot per claim.
function buildDotGroups(articleText: string, claims: Claim[]): Array<{ key: string; node: ReactNode }> {
  const spans = matchClaimSpans(articleText, claims);
  const homeSentence = assignHomeSentence(articleText, claims);
  const { claimNumbers } = numberCitations(articleText, claims, spans);

  const bySentence = new Map<number, Claim[]>();
  for (const claim of claims) {
    const key = homeSentence.get(claim.id) ?? -1;
    const group = bySentence.get(key);
    if (group) group.push(claim);
    else bySentence.set(key, [claim]);
  }

  const groups: Array<{ key: string; node: ReactNode }> = [];
  for (const [sentenceIndex, groupClaims] of [...bySentence.entries()].sort((a, b) => a[0] - b[0])) {
    const pending = groupClaims.filter((c) => c.status === 'pending');
    const resolved = groupClaims.filter((c) => c.status !== 'pending');

    if (pending.length > 0) {
      groups.push({
        key: `${sentenceIndex}-pending`,
        node: <PendingDot count={pending.length} href={firstSpannedHref(pending, spans)} />,
      });
    }

    // One dot per DISTINCT verdict present among SPANNED claims, plus one per DISTINCT verdict
    // among UNSPANNED claims — tracked separately (review finding, 2026-08-16) rather than deduped
    // together, so a spanned claim and an unspanned claim that happen to share a verdict don't
    // silently collapse into a single dot and drop one of them from view entirely. Both kinds are
    // solid-colored now (no more dashed/solid split); only where each dot links to differs.
    const spanned = resolved
      .filter((c) => spans.get(c.id) != null)
      .sort((a, b) => spans.get(a.id)!.start - spans.get(b.id)!.start);
    const unspanned = resolved.filter((c) => spans.get(c.id) == null);

    const seenSpanned = new Set<VerdictKey>();
    for (const c of spanned) {
      const verdictKey = verdictKeyOf(c);
      if (seenSpanned.has(verdictKey)) continue;
      seenSpanned.add(verdictKey);
      // `c` itself is spanned by construction, so it always has a rendered `#claim-mark-<id>`.
      groups.push({
        key: `${sentenceIndex}-spanned-${verdictKey}`,
        node: <ResultDot verdictKey={verdictKey} href={`#claim-mark-${c.id}`} />,
      });
    }

    const seenUnspanned = new Set<VerdictKey>();
    for (const c of unspanned) {
      const verdictKey = verdictKeyOf(c);
      if (seenUnspanned.has(verdictKey)) continue;
      seenUnspanned.add(verdictKey);
      const groupClaimsForKey = unspanned.filter((x) => verdictKeyOf(x) === verdictKey);
      groups.push({
        key: `${sentenceIndex}-unspanned-${verdictKey}`,
        node: <ResultDot verdictKey={verdictKey} href={unconfirmedHref(groupClaimsForKey, claimNumbers)} />,
      });
    }
  }
  return groups;
}

// Rendered only once a run exists (`runId` set) — GrounnelApp gates that, this component just
// distinguishes "no status yet" (indeterminate) from "status arrived" (numeric + grouped dots).
export default function GrounnelProgress({ status, articleText }: GrounnelProgressProps) {
  if (!status) {
    return (
      <div role="status" className="flex items-center gap-2 text-sm text-base-content/70">
        <span className="loading loading-dots loading-sm" />
        Finding claims…
      </div>
    );
  }

  const isTerminal = status.status === 'done' || status.status === 'failed';
  const { checked, total } = status.progress;
  const isStalled =
    !isTerminal &&
    status.elapsed_seconds !== null &&
    status.elapsed_seconds > SOFT_STALL_THRESHOLD_SECONDS;
  const dotGroups = buildDotGroups(articleText, status.claims);

  return (
    <div role="status" className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className={isTerminal ? '' : 'animate-pulse'}>
          {checked} / {total} claims checked
        </span>
        {status.elapsed_seconds !== null && (
          <span className="text-base-content/50">({formatElapsed(status.elapsed_seconds)})</span>
        )}
        {!isTerminal && <span className="loading loading-spinner loading-xs" />}
      </div>
      {dotGroups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dotGroups.map((group) => (
            <span key={group.key}>{group.node}</span>
          ))}
        </div>
      )}
      {status.caps_hit && (
        <p className="text-warning">Results are partial — the claim limit for this run was reached.</p>
      )}
      {isStalled && (
        <p className="text-base-content/60">This is taking longer than usual…</p>
      )}
    </div>
  );
}
