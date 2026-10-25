import { OWN_KEY_PROVIDERS, ownKeyTransparency, type OwnKeyChoice } from "../../lib/providerKey";

/** Own-key control only. Off means no provider choice, and the key is not written to storage (D033). */
export default function ProviderPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: OwnKeyChoice;
  onChange: (next: OwnKeyChoice) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={value.enabled}
          onChange={(event) => {
            if (event.target.checked) {
              onChange({ ...value, enabled: true });
              return;
            }
            onChange({ enabled: false, provider: "gemini", apiKey: "" });
          }}
        />
        Run this check on my own AI account
      </label>
      <p className="text-xs text-base-content/60">
        Grounnel normally uses our Google Gemini account. Instead, you can paste an API key from an
        AI provider and the fact-check runs on yours.
      </p>
      {value.enabled && (
        <>
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:gap-6" role="radiogroup" aria-label="Provider">
            {OWN_KEY_PROVIDERS.map((item) => (
              <div key={item.id} className="flex flex-col gap-1">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="grounnel-own-provider"
                    className="radio radio-sm"
                    checked={value.provider === item.id}
                    onChange={() => onChange({ ...value, provider: item.id })}
                  />
                  {item.label}
                </label>
                <a
                  href={item.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-hover ml-6 text-xs"
                >
                  {item.keyLinkLabel}
                </a>
              </div>
            ))}
          </div>
          <p className="text-xs text-base-content/60">
            An API key is the secret string (like sk-… or AIza…) the provider&apos;s API uses — not
            your login or password.
          </p>
          <input
            type="password"
            className="input input-bordered w-full"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="API key"
            aria-label="API key"
            value={value.apiKey}
            onChange={(event) => onChange({ ...value, apiKey: event.target.value })}
          />
          <details open className="rounded-lg border border-base-300 bg-base-100 p-3">
            <summary className="cursor-pointer text-sm font-medium">How your key is used</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-base-content/70">
              {ownKeyTransparency(value.provider).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </fieldset>
  );
}
