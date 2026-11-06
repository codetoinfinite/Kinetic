# Build: Models Picker

The model list from an agent's settings. Each row shows a small tinted provider monogram, the model name and a control on the right. In `single` mode the rows form one radio group and the chosen row sits on a soft grey fill, the way an active-model menu reads. In `multiple` mode every row is a switch that adds the model to the composer, and the header keeps an "N of M enabled" count. A search field filters by name and provider, and `children` render under a divider for things like an effort slider.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A card of models with provider monograms: pick one with radios, or enable several with switches, a search filter and a live count.

- Category: form
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1

## How it works

1. Split the props into a discriminated union on `selectionMode`: `single` takes `value: string` and `onChange(id)`, `multiple` takes `value: string[]` and `onChange(ids)`. Both are controlled-or-uncontrolled: local state seeds from `defaultValue` and `value` wins when given.
2. Single mode renders a react-aria `RadioGroup` whose `Radio`s ARE the rows (monogram, name, kit `RadioDot`), so one Tab stop enters the list, arrow keys move and select, and the selected row gets `bg-background-secondary-default`.
3. Multiple mode renders each row as a react-aria `Switch` with the kit `SwitchTrack` on the right, inside a `role="group"` named by the label. Toggling rebuilds the value by filtering `models` in their own order, so the array is stable no matter which order rows were flipped.
4. The search query is trimmed, lowercased and matched against `name + provider + description`; the filtered list replaces the rows, and an empty result prints "No models match …" instead. The count in the header always counts the whole list, not the filtered rows.
5. The monogram is a 28px rounded square with one or two letters (`monogram` or the provider's first letter) on a status tint, `aria-hidden`; the provider name is added as visually hidden text so the radio or switch is announced as "Fable 5, Anthropic".

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `monogram = size-7, rounded 8px, caption-1 semibold`
  Big enough for two letters at a glance, small enough that the model name stays the first thing read.
- `row padding = px-2.5 py-2, rounded-2lg, 2px gap`
  The selected fill needs air around it inside the 6px card padding, and a 2px gap keeps adjacent hover fills from merging.
- `searchable default = more than 5 models`
  A short list is faster to scan than to search; past a screenful, a filter pays for its height.

## API

```ts
function ModelsPicker(props: ({ selectionMode?: "single"; value?: string; defaultValue?: string; onChange?: (id: string) => void } | { selectionMode: "multiple"; value?: string[]; defaultValue?: string[]; onChange?: (ids: string[]) => void }) & { models: ModelOption[]; label?: ReactNode; searchable?: boolean; searchPlaceholder?: string; children?: ReactNode; className?: string }): JSX.Element
type ModelOption = { id: string; name: string; provider: string; monogram?: string; tone?: ModelMonogramTone; description?: string; isDisabled?: boolean }
```

- `models: ModelOption[]`
  Rows in display order: id, name, provider, optional monogram letters, tint, caption and disabled flag.
- `selectionMode: "single" | "multiple"` — default `"single"`
  Radio rows for one active model, or switch rows for an enabled set.
- `value: string | string[]`
  Controlled selection: an id in single mode, an id array in multiple mode.
- `defaultValue: string | string[]`
  Initial selection when uncontrolled.
- `onChange: (id: string) => void | (ids: string[]) => void`
  Called with the new id or the new id array, in the models' order.
- `label: ReactNode` — default `"Models"`
  Header title; a string also names the radio group or switch group.
- `searchable: boolean` — default `models.length > 5`
  Show the search field above the rows.
- `searchPlaceholder: string` — default `"Search models"`
  Placeholder of the search field.
- `children: ReactNode`
  Footer content under a divider, e.g. an effort control.
- `className: string`
  Merged onto the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ModelsPicker(props: ModelsPickerProps) {
  const { models, label = "Models", searchPlaceholder = "Search models", children, className } = props;
  const multiple = props.selectionMode === "multiple";
  const searchable = props.searchable ?? models.length > 5;

  const [query, setQuery] = useState("");
  const [single, setSingle] = useState<string | undefined>(
    props.selectionMode === "multiple" ? undefined : props.defaultValue,
  );
  const [many, setMany] = useState<string[]>(
    props.selectionMode === "multiple" ? (props.defaultValue ?? []) : [],
  );

  const selectedOne = props.selectionMode === "multiple" ? undefined : (props.value ?? single);
  const selectedMany = props.selectionMode === "multiple" ? (props.value ?? many) : [];

  const pick = (id: string) => {
    if (props.selectionMode === "multiple") return;
    setSingle(id);
    props.onChange?.(id);
  };

  const toggle = (id: string, on: boolean) => {
    if (props.selectionMode !== "multiple") return;
    // Keep the models' own order so the value is stable however it was toggled.
    const next = models.filter((m) => (m.id === id ? on : selectedMany.includes(m.id))).map((m) => m.id);
    setMany(next);
    props.onChange?.(next);
  };

  const q = query.trim().toLowerCase();
  const shown = q
    ? models.filter((m) => `${m.name} ${m.provider} ${m.description ?? ""}`.toLowerCase().includes(q))
    : models;

  const groupLabel = typeof label === "string" ? label : "Models";
  const count = multiple
    ? `${models.filter((m) => selectedMany.includes(m.id)).length} of ${models.length} enabled`
    : `${models.length} available`;

  const empty = (
    <p className="px-2.5 py-6 text-center text-caption-1-medium text-text-tertiary">
      No models match “{query.trim()}”
    </p>
  );

  return (
    <section
      className={cx(
        // Dark: primary and tertiary are both neutral-800, so the card drops to
        // secondary or the off switch tracks and the search field disappear.
        "flex w-full min-w-0 flex-col gap-1 rounded-2xl border border-border-table bg-background-primary-default p-1.5 shadow-xs dark:bg-background-secondary-default",
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-3 px-2.5 pt-1.5 pb-1">
        <h3 className="text-body-medium text-text-secondary">{label}</h3>
        <span className="text-caption-1-medium text-text-tertiary tabular-nums" aria-live="polite">
          {count}
        </span>
      </header>

      {searchable ? (
        <SearchField
          aria-label={`Search ${groupLabel.toLowerCase()}`}
          placeholder={searchPlaceholder}
          size="small"
          value={query}
          onChange={setQuery}
          className="px-1 pb-1"
        />
      ) : null}

      {multiple ? (
        <div role="group" aria-label={groupLabel} className="flex flex-col gap-0.5">
          {shown.length === 0
            ? empty
            : shown.map((m) => (
                <AriaSwitch
                  key={m.id}
                  isSelected={selectedMany.includes(m.id)}
                  isDisabled={m.isDisabled}
                  onChange={(on) => toggle(m.id, on)}
                  className={({ isHovered, isDisabled }) =>
                    cx(
                      row,
                      isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                      isHovered && "bg-background-primary-hover",
                    )
                  }
                >
                  {(state) => (
                    <>
                      <ModelMonogram model={m} />
                      <ModelText model={m} />
                      <SwitchTrack state={state} size="sm" />
                    </>
                  )}
                </AriaSwitch>
              ))}
        </div>
      ) : (
        <AriaRadioGroup
          aria-label={groupLabel}
          value={selectedOne ?? null}
          onChange={pick}
          className="flex flex-col gap-0.5"
        >
          {shown.length === 0
            ? empty
            : shown.map((m) => (
                <AriaRadio
                  key={m.id}
                  value={m.id}
                  isDisabled={m.isDisabled}
                  className={({ isSelected, isHovered, isDisabled }) =>
                    cx(
                      row,
                      isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                      isSelected
                        ? "bg-background-secondary-default dark:bg-background-primary-default"
                        : isHovered && "bg-background-primary-hover",
                    )
                  }
                >
                  {({ isSelected, isFocusVisible }) => (
                    <>
                      <ModelMonogram model={m} />
                      <ModelText model={m} />
                      <RadioDot selected={isSelected} focusVisible={isFocusVisible} />
                    </>
                  )}
                </AriaRadio>
              ))}
        </AriaRadioGroup>
      )}

      {children != null && children !== false ? (
        <>
          <hr className="mx-1 mt-1 border-border-table" />
          <div className="px-2.5 pt-1.5 pb-2">{children}</div>
        </>
      ) : null}
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: state is the query and the uncontrolled selection, with no timers, listeners or observers.

**Reduced motion.** The only motion is the 150ms row hover and selected fill, plus the kit switch thumb; rows carry `motion-reduce:transition-none` and the switch track follows its own reduced-motion rule.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Wrapping a radio input in a clickable div. The row must BE the radio (or switch) so the whole row is the hit target and the accessible name covers the model, not just the dot.
- Counting the filtered rows. "2 of 8 enabled" must not drop to "1 of 3" while a search is typed.
- Drawing provider logos. The glyph is letters on a tint, which avoids trademark artwork and still tells providers apart.

## Notes

- Pass `searchable` explicitly to force the field on a short list or hide it on a long one.
- The demo puts the kit `Slider` (0–3, no tooltip) under the active-model list as an effort control with Faster and Smarter labels.

## Definition of done

Left card: "Fable 5" is selected; clicking "Sonnet 5" moves the grey fill and the radio, and ArrowDown from it wraps to "Composer 2.5". Pressing ArrowRight on the Effort slider changes "Medium" to "High". Right card reads "4 of 8 enabled"; switching on Gemini makes it "5 of 8"; typing "anthropic" leaves 3 rows with the count unchanged, and "zzz" shows "No models match".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
