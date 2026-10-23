import { OWN_KEY_PROVIDERS, ownKeyNotice, type OwnKeyChoice } from "../../lib/providerKey";

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
        Use my own key
      </label>
      {!value.enabled && (
        <p className="text-xs text-base-content/60">Model calls are processed by Google.</p>
      )}
      {value.enabled && (
        <>
          <div className="flex flex-wrap gap-4 text-sm" role="radiogroup" aria-label="Provider">
            {OWN_KEY_PROVIDERS.map((item) => (
              <label key={item.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="grounnel-own-provider"
                  className="radio radio-sm"
                  checked={value.provider === item.id}
                  onChange={() => onChange({ ...value, provider: item.id })}
                />
                {item.label}
              </label>
            ))}
          </div>
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
          <p className="text-xs text-base-content/70">{ownKeyNotice(value.provider)}</p>
        </>
      )}
    </fieldset>
  );
}
