import type { ClaimVerdict } from '../types/grounnel';

/**
 * Single source of truth for verdict → color, shared by HighlightedArticle (span highlight,
 * needs the low-opacity /30 variant) and GrounnelProgress (solid per-claim dot, full strength).
 * Classes are written out in full here (not built via `bg-${token}` string interpolation)
 * because Tailwind's content scanner only picks up literal class names it can find in source —
 * a dynamically-constructed class name silently produces no CSS in the production build.
 */
export const VERDICT_HIGHLIGHT_CLASS: Record<ClaimVerdict, string> = {
  supported: 'bg-success/30',
  contradicted: 'bg-error/30',
  partially_supported: 'bg-warning/30',
  unsupported: 'bg-neutral/20',
  unverifiable: 'bg-info/30',
};

export const VERDICT_DOT_CLASS: Record<ClaimVerdict, string> = {
  supported: 'bg-success',
  contradicted: 'bg-error',
  partially_supported: 'bg-warning',
  unsupported: 'bg-neutral',
  unverifiable: 'bg-info',
};
