// The current run, kept in localStorage (not sessionStorage) so a new tab sees it too. Two tabs
// share one slot and the newer run wins — accepted for the MVP. `runId` is internal and never
// becomes a URL; the shareable address is the share token (core spec 019, FR-003).

const KEY = 'grounnel.run';
// Core keeps a run's status in Redis for 7 days, so a stored id older than that can no longer be
// polled. Dropping it here beats rehydrating into a run that will only ever 404.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface StoredRun {
  runId: string;
  articleText: string;
  savedAt: number;
}

export function loadRun(): StoredRun | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRun>;
    if (typeof parsed.runId !== 'string' || typeof parsed.articleText !== 'string') return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return { runId: parsed.runId, articleText: parsed.articleText, savedAt: parsed.savedAt };
  } catch {
    // Private mode, cleared site data, or corrupt JSON — starting fresh is the right answer.
    return null;
  }
}

export function saveRun(runId: string, articleText: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ runId, articleText, savedAt: Date.now() }));
  } catch {
    // Quota or a blocked store: persistence is a convenience, never a precondition for the run.
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Same as above.
  }
}
