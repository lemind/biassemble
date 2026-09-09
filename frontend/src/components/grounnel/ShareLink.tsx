import { useState } from 'react';

// Shown as soon as the run is submitted, not when it finishes: core mints the token at creation,
// so the link exists before the result does (019 FR-001) and outlives this browser tab.
export default function ShareLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/check/${token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked without a secure context or a user gesture in some browsers — the
      // input below is selectable, so the link is still obtainable.
    }
  };

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-3">
      <p className="text-sm font-medium">Link to this check</p>
      <p className="text-xs text-base-content/60">
        Works now and after the run finishes. Anyone with the link can read it — it does not expire
        and cannot be withdrawn.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="input input-sm input-bordered w-full font-mono text-xs"
          aria-label="Shareable link to this check"
        />
        <button type="button" className="btn btn-sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
