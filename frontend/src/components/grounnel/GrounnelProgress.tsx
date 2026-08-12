import type { ReactNode } from 'react';
import { assignHomeSentence, matchClaimSpans } from '../../lib/matchClaimSpans';
import { numberCitations } from '../../lib/numberCitations';
import { VERDICT_DOT_CLASS } from '../../lib/verdictStyle';
import type { Claim, GrounnelStatusOutput } from '../../types/grounnel';

interface GrounnelProgressProps {
  status: GrounnelStatusOutput | null;
  articleText: string;
}

const SOFT_STALL_THRESHOLD_SECONDS = 60;

function PendingDot({ count }: { count: number }) {
  return (
    <span
      aria-hidden="true"
      title={count > 1 ? `${count} claims checking…` : 'Checking…'}
      className="loading loading-spinner loading-xs text-base-content/40"
    />
  );
}

// Verified (real verdict/sources) but matchClaimSpans found nowhere in the article text to
// highlight it — not lost, just not located. Links straight to it below (its first reference's
// `#ref-<n>` if it has one, else ClaimSourceList's "Not independently sourced" `#claim-source-<id>`
// fallback) instead of leaving a dashed dot that only explains itself on hover — no hover target
// on touch devices, and even with a mouse a tooltip alone doesn't tell you WHERE to look.
function UnconfirmedDot({ count, href }: { count: number; href: string }) {
  return (
    <a
      href={href}
      title={
        count > 1
          ? `${count} claims verified — not highlighted above, click to see them below`
          : 'Verified — not highlighted above, click to see it below'
      }
      className="inline-block h-2.5 w-2.5 cursor-pointer rounded-full border border-dashed border-base-content/40 hover:border-base-content/70"
    />
  );
}

// A matched claim (already visible inline, right next to this dot) whose own verification
// failed, or which resolved with no verdict — dashed like UnconfirmedDot (FR-012's "distinct
// from a real verdict" cue) but not a link: there's nowhere more useful to send a click, it's
// already on screen.
function FailedDot() {
  return (
    <span
      aria-hidden="true"
      title="Verification failed"
      className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-base-content/40"
    />
  );
}

function ConfirmedDot({ claim }: { claim: Claim }) {
  if (claim.status === 'failed' || !claim.verdict) {
    return <FailedDot />;
  }
  return (
    <span
      aria-hidden="true"
      title={claim.verdict}
      className={`inline-block h-2.5 w-2.5 rounded-full ${VERDICT_DOT_CLASS[claim.verdict]}`}
    />
  );
}

// One "how much of the article is checked" row, grouped by which sentence a claim belongs to —
// not one dot per claim. A sentence EXTRACT split into several atomic claims (T034/D-whatever
// compound-sentence case) that all resolve to the same visible highlighted text shouldn't draw
// 3 identical dots for what's visually one colored chunk; a claim that never got a highlight at
// all (matchClaimSpans returned null) shouldn't silently vanish from the count either — it gets
// folded into one shared "unconfirmed" dot per sentence instead of one dot per claim.
// Where an unconfirmed claim's dot should send a click: its first cited source's reference entry
// if it has one, else the "Not independently sourced" fallback entry ClaimSourceList always
// renders for a claim with zero citations — either way, a real anchor that always exists.
function unconfirmedHref(claims: Claim[], claimNumbers: Map<string, number[]>): string {
  for (const claim of claims) {
    const numbers = claimNumbers.get(claim.id) ?? [];
    if (numbers.length > 0) return `#ref-${numbers[0]}`;
  }
  return `#claim-source-${claims[0]!.id}`;
}

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
    const confirmed = resolved
      .filter((c) => spans.get(c.id) !== null)
      .sort((a, b) => spans.get(a.id)!.start - spans.get(b.id)!.start);
    const unconfirmed = resolved.filter((c) => spans.get(c.id) === null);

    if (pending.length > 0) {
      groups.push({ key: `${sentenceIndex}-pending`, node: <PendingDot count={pending.length} /> });
    }
    if (confirmed.length > 0) {
      // One dot per DISTINCT verdict color present, not one dot total — the clause-splitting
      // fallback in matchClaimSpans.ts means two claims from the same sentence can now match
      // separate, differently-colored clauses (e.g. one supported, one contradicted); collapsing
      // to a single dot colored by only the earliest-starting claim would silently hide the
      // other verdict. Claims that already share a color (the common case this grouping exists
      // for) still collapse into one dot, in earliest-span order.
      const seenVerdicts = new Set<string>();
      for (const c of confirmed) {
        const verdictKey = c.status === 'failed' || !c.verdict ? 'failed' : c.verdict;
        if (seenVerdicts.has(verdictKey)) continue;
        seenVerdicts.add(verdictKey);
        groups.push({ key: `${sentenceIndex}-confirmed-${verdictKey}`, node: <ConfirmedDot claim={c} /> });
      }
    }
    if (unconfirmed.length > 0) {
      groups.push({
        key: `${sentenceIndex}-unconfirmed`,
        node: <UnconfirmedDot count={unconfirmed.length} href={unconfirmedHref(unconfirmed, claimNumbers)} />,
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
