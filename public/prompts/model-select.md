# Build: Model Select

A model picker for chat composers, built on the kit Select so it keeps React Aria listbox behaviour: arrow keys, typeahead, Escape and screen-reader selection state. Each row shows a tinted two-letter monogram, the model name with optional New and Pro badges, a muted description and a check on the selected model. The trigger shows a small monogram and the name; the ghost variant sits flat in a toolbar, and the outline variant is the regular bordered field.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Model picker on the kit Select. Rows show a tinted monogram, name, description, New/Pro badges and a check on the current model.

- Category: form
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. The kit `Select` is driven through `selectedKey` and `onSelectionChange`. When `value` is passed the component is controlled; otherwise it keeps its own pick in state, seeded from `defaultValue` or the first enabled model. `onChange` receives both the id and the full model object.
2. Rows are kit `SelectItem`s (React Aria `ListBoxItem`) with `textValue` set to the model name, so typing "de" jumps to Deep 1 even though the row also holds badges and a description.
3. Inside each row the name and badges sit in a React Aria `Text slot="label"` and the description in `Text slot="description"`. The option is labelled by the name and described by the line under it, so the description is announced as a hint, not as part of the name.
4. The monogram is the `monogram` field or, when it is missing, the first character of the first two words of the name ("Deep 1" becomes "D1"). Its square takes a `status-*-background` / `status-*-text` token pair from `tone`, which the kit theme defines for light and dark.
5. The check is always rendered and switches between `opacity-0` and `opacity-100`, so rows never shift width when the selection moves. React Aria already sets `aria-selected` on the option, so the icon is `aria-hidden`.
6. `renderValue` puts a 20px monogram and the name in the trigger. `compact` makes the name `sr-only`, leaving only the monogram on screen while the trigger keeps its accessible text.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `popover size = 320px wide, list up to 336px tall`
  Wide enough for a name with both badges and a description of about 34 characters on one line; the kit menu surface caps it at `100vw - 32px` on phones. The kit listbox stops at 240px, which would hide the fifth two-line row, so the popover lifts that cap through a `[&_[role=listbox]]` variant and longer lists scroll past 336px.
- `monogram = 32px rows / 20px trigger, two characters`
  Two characters keep model families apart ("S2" and "SM") without becoming a logo. 32px matches the height of the two-line text block, so rows stay centred.
- `GHOST_TRIGGER = transparent border, background and shadow; secondary surface on hover or press`
  Inside a composer toolbar a bordered field reads as a form input. The ghost trigger looks like a label until it is pointed at.

## API

```ts
function ModelSelect(props: { models?: ModelOption[]; value?: string; defaultValue?: string; onChange?: (id: string, model: ModelOption) => void; variant?: "ghost" | "outline"; size?: "sm" | "md"; label?: ReactNode; "aria-label"?: string; isDisabled?: boolean; compact?: boolean; className?: string }): JSX.Element
interface ModelOption { id: string; name: string; description?: string; monogram?: string; tone?: ModelTone; badges?: ("new" | "pro")[]; isDisabled?: boolean }
```

- `models: ModelOption[]` — default `MODEL_OPTIONS`
  Rows of the menu, in order.
- `value: string`
  Selected model id. Passing it makes the select controlled.
- `defaultValue: string`
  Starting model when uncontrolled. Defaults to the first enabled model.
- `onChange: (id: string, model: ModelOption) => void`
  Called with the new id and its model when a row is chosen.
- `variant: "ghost" | "outline"` — default `"ghost"`
  Flat trigger for toolbars, or the kit's bordered field.
- `size: "sm" | "md"` — default `"md"`
  Trigger and row density, passed to the kit Select. `sm` also shrinks the row monograms.
- `label: ReactNode`
  Visible label above the trigger. Without it the select is named by `aria-label`.
- `aria-label: string` — default `"Model"`
  Accessible name when there is no visible label.
- `isDisabled: boolean`
  Disables the whole select.
- `compact: boolean` — default `false`
  Shows only the monogram in the trigger; the name stays for screen readers.
- `className: string`
  Classes for the select wrapper.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ModelSelect({
  models = MODEL_OPTIONS,
  value,
  defaultValue,
  onChange,
  variant = "ghost",
  size = "md",
  label,
  "aria-label": ariaLabel = "Model",
  isDisabled,
  compact = false,
  className,
}: ModelSelectProps) {
  const fallback = models.find((m) => !m.isDisabled)?.id ?? models[0]?.id ?? null;
  const [internal, setInternal] = useState<string | null>(defaultValue ?? fallback);
  // Controlled when `value` is passed; otherwise the select keeps its own pick.
  const selectedId = value ?? internal;
  const selected = models.find((m) => m.id === selectedId);

  return (
    <Select<ModelOption>
      label={label}
      aria-label={label ? undefined : ariaLabel}
      size={size}
      isDisabled={isDisabled}
      selectedKey={selectedId}
      disabledKeys={models.filter((m) => m.isDisabled).map((m) => m.id)}
      onSelectionChange={(key) => {
        if (key == null) return;
        const id = String(key);
        const model = models.find((m) => m.id === id);
        if (!model) return;
        if (value === undefined) setInternal(id);
        onChange?.(id, model);
      }}
      className={cx("w-fit", className)}
      triggerClassName={variant === "ghost" ? GHOST_TRIGGER : undefined}
      // The kit listbox caps at 240px; five two-line rows need about 300px.
      popoverClassName="w-[320px] [&_[role=listbox]]:max-h-[336px]"
      renderValue={
        selected ? (
          <>
            <ModelMonogram model={selected} small />
            <span data-model-name className={cx("truncate", compact && "sr-only")}>{selected.name}</span>
          </>
        ) : (
          <span className="text-text-placeholder">Choose a model</span>
        )
      }
    >
      {models.map((model) => {
        const isSelected = model.id === selectedId;
        return (
          <SelectItem key={model.id} id={model.id} textValue={model.name} className="gap-2.5">
            <ModelMonogram model={model} small={size === "sm"} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Text slot="label" className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{model.name}</span>
                <ModelBadges badges={model.badges} />
              </Text>
              {model.description && (
                <Text slot="description" className="truncate text-body-2-regular text-text-tertiary">
                  {model.description}
                </Text>
              )}
            </span>
            <RiCheckLine
              aria-hidden
              className={cx(
                "size-4 shrink-0 text-accent-500 transition-opacity duration-150 ease-out motion-reduce:transition-none",
                isSelected ? "opacity-100" : "opacity-0",
              )}
            />
          </SelectItem>
        );
      })}
    </Select>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The component adds no timers or listeners of its own. Open state, outside-press dismissal and focus restore belong to the kit Select and React Aria.

**Reduced motion.** The check fades with `motion-reduce:transition-none`, so it switches instantly. The popover open animation and chevron turn come from the kit Select.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving out `textValue` on rows with rich content. React Aria then cannot build typeahead text or the trigger's accessible value from the row.
- Putting the description inside the label. Screen readers then read "Deep 1 Slower, reasons for longer" as the model's name; the `description` slot keeps it as a hint.
- Mounting the check only on the selected row. The text column then reflows as the check appears; toggling opacity keeps every row the same width.

## Notes

- The model list, names and descriptions are sample data. Pass your own `models`; badges are any mix of `"new"` and `"pro"`.
- Disabled models go to the kit Select as `disabledKeys`, and the uncontrolled default skips them.
- The kit Select places its popover below the trigger and flips it above when there is no room, which is what happens at the foot of a chat.

## Definition of done

The trigger shows a tinted monogram and the model name. Opening it lists five models with descriptions; Atlas 3 and Lumen 1 carry New, Deep 1 and Lumen 1 carry Pro. The current model has a check. Choosing a row closes the menu, moves the check and updates the trigger and the demo sentence. Arrow keys and typeahead work, and Escape closes the menu.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
