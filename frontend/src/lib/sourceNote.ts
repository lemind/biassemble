import type { Claim } from '../types/grounnel';

/**
 * The one line of wording above a claim's source links. One exhaustive function rather than four
 * independent booleans: T015 was a claim that matched none of them and fell through to bare,
 * unexplained links. A single return makes "no note at all" a deliberate case, not an accident.
 */
export type SourceNote =
  | 'no-sources-found'
  | 'searched-unconfirmed'
  | 'supporting'
  | 'refuting'
  | 'unevaluated'
  | null;

export const SOURCE_NOTE_TEXT: Record<Exclude<SourceNote, null>, string> = {
  'no-sources-found': 'No sources were found to check this claim.',
  'searched-unconfirmed': 'Searched, found nothing that confirms this:',
  supporting: 'Supporting sources (no exact sentence matched):',
  refuting: 'Refuting sources (no exact sentence matched):',
  unevaluated: 'Verification incomplete — sources retrieved but not evaluated:',
};

export function sourceNote(claim: Claim, sourceCount: number): SourceNote {
  // A claim that reached no verdict is the state, not `sourceCount` as a proxy for it — those
  // coincide today and this should stay correct if they stop (T015).
  if (claim.verdict === null) return sourceCount > 0 ? 'unevaluated' : null;

  // A resolved citation speaks for itself; these notes exist for links with nothing quoted.
  if (claim.citations.length > 0) return null;

  switch (claim.verdict) {
    case 'unsupported':
    case 'unverifiable':
      return sourceCount > 0 ? 'searched-unconfirmed' : 'no-sources-found';
    case 'supported':
    case 'partially_supported':
      return sourceCount > 0 ? 'supporting' : null;
    // T014 — `contradicted` used to ride along with the affirmative verdicts, so a refuted claim
    // showed its refuting evidence labelled as supporting it.
    case 'contradicted':
      return sourceCount > 0 ? 'refuting' : null;
    default:
      return null;
  }
}
