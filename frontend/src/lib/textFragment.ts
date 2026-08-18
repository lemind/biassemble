// Browsers that support the Text Fragments spec (Chrome/Edge/Opera; Safari/Firefox just load the
// plain page, no error) scroll to and highlight the matched text on arrival — the actual "link to
// the exact text, with proof" this exists for, not just a link to the source's homepage.
//
// A single short anchor, not a start,end range: a range needs BOTH endpoints to independently
// match nearby text, which is strictly more ways to fail than one short anchor needs. Real-world
// Text Fragment usage (and Chrome's own matching behavior) is more reliable with a short, unique
// phrase than a long one — long citation text is also the case most likely to have been fused
// from separate DOM nodes upstream (e.g. table/infobox cells flattened into one "sentence" by
// biassemble-core's HTML-to-text extraction) and never existed as one contiguous run on the page
// at all, which no anchor length fixes; keeping the anchor short at least maximizes the odds for
// citations that ARE genuine contiguous prose.
const MAX_ANCHOR_WORDS = 10;

const PUNCTUATION_ONLY_RE = /^[.,;:!?"'“”‘’()]+$/;

function trimPunctuationOnlyEdges(words: string[]): string[] {
  let start = 0;
  let end = words.length;
  while (start < end && PUNCTUATION_ONLY_RE.test(words[start]!)) start++;
  while (end > start && PUNCTUATION_ONLY_RE.test(words[end - 1]!)) end--;
  return words.slice(start, end);
}

// Passage extraction upstream (biassemble-core's HTML-to-text conversion) sometimes leaves a
// stray space before punctuation — confirmed live: Wikipedia infobox/wikilink-joined text reads
// "Andernach , Prussia" (extra space before the comma), and even plain prose can pick this up
// ("Gustave Eiffel , whose"). Chrome's Text Fragment matcher does NOT reliably normalize this
// away — confirmed by direct test: a 6-word anchor ending right before the stray space matched
// the live page fine, but a 10-word anchor extending past it into ", whose" silently failed to
// match at all. Normalizing here fixes it regardless of where an anchor happens to end.
export function normalizePunctuationSpacing(text: string): string {
  return text.replace(/\s+([.,;:!?)])/g, '$1').replace(/(\()\s+/g, '$1');
}

export function buildTextFragmentUrl(url: string, text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, MAX_ANCHOR_WORDS);
  const anchor = normalizePunctuationSpacing(trimPunctuationOnlyEdges(words).join(' '));
  // A citation that's entirely punctuation (or empty) trims to nothing — fall back to a plain
  // link rather than shipping a dangling, broken-looking `#:~:text=`.
  return anchor.length > 0 ? `${url}#:~:text=${encodeURIComponent(anchor)}` : url;
}
