# Build: Search Field

A query field for filtering a list or searching a table. It puts Input's field shell inside React Aria's `SearchField`, rounds it into a pill by default, and adds a search icon at the start and a small clear button at the end that scales and fades in once there is text. `isLoading` cross-fades the icon into Spinner's orbiting light in the same 20px box. Escape clears the text and Enter calls `onSubmit`.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Pill or rounded search input on React Aria SearchField: Escape clears, a clear button scales in with text, and the icon fades to a spinner.

- Category: form
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `SearchField` renders `AriaSearchField` as `group flex w-full flex-col items-start gap-1` and always passes it a `value`: the controlled `value` when given, otherwise its own `uncontrolledValue` state. Its `change` function updates that state and calls `onChange`, so the clear button can work in both modes. With no `label` or `aria-label`, the `placeholder` becomes the `aria-label`.
2. The render function shows `Label` when `label` is set, then Input's `InputBase` with `fieldClassName` set to `rounded-full` for `shape="pill"` (the default; `rounded` keeps Input's 10px corners), then `HintText` when `hint` is set. The input hides the browser's own WebKit cancel button so only the kit's clear button shows.
3. The `leadingAddon` is one `aria-hidden` 20px box holding two absolutely positioned layers: the `icon` (default `RiSearchLine`) and `SpinnerGlyph size="sm"`. Both transition `opacity` and `scale` over 200ms. When `isLoading` the icon goes to `scale-75 opacity-0` and the spinner comes in; otherwise the spinner is faded out and its spin is paused with `[animation-play-state:paused]` on its children, so it stays mounted for the fade but does no work.
4. The `trailingAddon` is a `CloseButton size="2xs"` (16px) on `bg-background-tertiary-hover`. While the field is empty or disabled it is `pointer-events-none scale-50 opacity-0` and `aria-hidden`; once there is text it transitions to `scale-100 opacity-100` over 150ms. It has `tabIndex={-1}`, because Escape already clears from the keyboard.
5. Clicking the clear button runs `clear`: `change("")`, `onClear`, then focus back to the input. Its `onMouseDown` calls `preventDefault`, so the input never loses focus while the pointer is down. React Aria's own Escape handling clears through the same `change` and `onClear`.
6. The clear button's accessible name goes through `useTemplateCopy`, which returns the string unchanged unless a template copy provider is present, so the default "Clear search" can be localised.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `icon box = size-5 (20px), ms-1`
  The icon and the spinner share one box and cross-fade in place, so the text never moves when loading starts. A leading addon drops the shell's start padding to 4px (`ps-1`), so the 4px margin brings the icon back to the 8px inset of a plain field.
- `icon / spinner fade = 200ms opacity + scale, hidden at scale-75`
  A short shrink while fading reads as one glyph turning into the other rather than two overlapping.
- `clear button = CloseButton 2xs (16px), 150ms opacity + scale from scale-50`
  Small enough to sit inside the 36px shell. Scaling in from half size makes it appear as the first character is typed without a jump in the layout, since it always occupies its slot.
- `shape = pill (rounded-full) by default, rounded (Input's rounded-2lg) as the option`
  The pill marks the field as search at a glance; `rounded` keeps Input's corners so it lines up with other fields in a form.

## API

```ts
function SearchField(props: Omit<AriaSearchFieldProps, "className" | "children"> & { label?: ReactNode; hint?: ReactNode; placeholder?: string; size?: "medium" | "small"; shape?: "pill" | "rounded"; isLoading?: boolean; icon?: IconComponent; clearLabel?: string; className?: string; fieldClassName?: string }): JSX.Element
```

- `value / defaultValue / onChange: string / (value: string) => void`
  Controlled or uncontrolled query.
- `onSubmit: (value: string) => void`
  Called on Enter, from React Aria.
- `onClear: () => void`
  Called when Escape or the clear button empties the field.
- `shape: "pill" | "rounded"` — default `"pill"`
  Fully rounded, or Input's 10px corners.
- `size: "medium" | "small"` — default `"medium"`
  36px or 32px shell.
- `isLoading: boolean` — default `false`
  Cross-fades the icon into a spinner.
- `icon: ComponentType` — default `RiSearchLine`
  Replaces the search icon.
- `clearLabel: string` — default `"Clear search"`
  Accessible name of the clear button.
- `label / hint: ReactNode`
  Label above and caption below, as on Input.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function SearchField({
  label,
  hint,
  placeholder,
  size = "medium",
  shape = "pill",
  isLoading = false,
  icon: Icon = RiSearchLine,
  clearLabel = "Clear search",
  value: controlledValue,
  defaultValue = "",
  onChange,
  onClear,
  "aria-label": ariaLabel,
  className,
  fieldClassName,
  ...props
}: SearchFieldProps) {
  const localize = useTemplateCopy();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = controlledValue ?? uncontrolledValue;

  const change = (next: string) => {
    setUncontrolledValue(next);
    onChange?.(next);
  };

  const clear = () => {
    change("");
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <AriaSearchField
      {...props}
      value={value}
      onChange={change}
      onClear={onClear}
      aria-label={ariaLabel ?? (!label ? placeholder : undefined)}
      className={cx("group flex w-full flex-col items-start gap-1", className)}
    >
      {({ isEmpty, isDisabled, isInvalid }) => (
        <>
          {label ? (
            <Label isRequired={props.isRequired} isInvalid={isInvalid}>
              {label}
            </Label>
          ) : null}
          <InputBase
            ref={inputRef}
            size={size}
            placeholder={placeholder}
            fieldClassName={cx(shape === "pill" && "rounded-full", fieldClassName)}
            className="[&::-webkit-search-cancel-button]:hidden"
            leadingAddon={
              // The icon and the light share one 20px box and cross-fade.
              <span aria-hidden className="relative ms-1 size-5 shrink-0">
                <Icon
                  className={cx(
                    "absolute inset-0 size-5 transition-[opacity,scale] duration-200 ease-out",
                    isLoading && "scale-75 opacity-0",
                  )}
                />
                <span
                  className={cx(
                    "absolute inset-0 flex items-center justify-center transition-[opacity,scale] duration-200 ease-out",
                    // Hidden, the light stays mounted for the fade but stops turning.
                    !isLoading && "scale-75 opacity-0 [&_*]:[animation-play-state:paused]",
                  )}
                >
                  <SpinnerGlyph size="sm" />
                </span>
              </span>
            }
            trailingAddon={
              <CloseButton
                size="2xs"
                aria-label={localize(clearLabel)}
                aria-hidden={isEmpty || undefined}
                tabIndex={-1}
                disabled={isDisabled}
                // Keep focus in the input while the pointer clears it.
                onMouseDown={(event) => event.preventDefault()}
                onClick={clear}
                className={cx(
                  "me-0.5 bg-background-tertiary-hover transition-[opacity,scale,color] duration-150 ease-out",
                  isEmpty || isDisabled ? "pointer-events-none scale-50 opacity-0" : "scale-100 opacity-100",
                )}
              />
            }
          />
          {hint ? <HintText isInvalid={isInvalid}>{hint}</HintText> : null}
        </>
      )}
    </AriaSearchField>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component keeps one piece of state and a ref; the spinner's CSS animation is paused while hidden.

**Reduced motion.** The fades are CSS transitions and the component does not check `prefers-reduced-motion` itself. Spinner's glyph does: under `motion-reduce` its spin slows from 900ms to 2400ms per turn.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not unmount the spinner when not loading. It stays mounted at `opacity-0` with its animation paused so it can fade in and out; unmounting would make it pop.
- Do not put the clear button in the tab order. Escape already clears from the keyboard, and a tabbable 16px button would add an extra stop on every search.
- Do not remove the `onMouseDown` `preventDefault` on the clear button. Without it, pressing the button blurs the input first, which closes any results popover tied to focus.
- Do not leave the field with no `label`, `aria-label` or string `placeholder`. Nothing would name it.

## Notes

- The field imports `InputBase` from Input, `Label` and `HintText` from Input's companions, `CloseButton` from Close Button and `SpinnerGlyph` from Spinner, so install those items alongside it.
- The clear button always occupies its slot, even when hidden, so the text area width does not change when text is typed.

## Definition of done

An empty pill field shows a search icon and no clear button. Typing a letter scales the clear button in at the end; clicking it empties the field and keeps the caret in it. Escape also clears it. While `isLoading` is true the search icon shrinks away and a spinning light takes its place, then swaps back when loading ends. With `shape="rounded"` the corners match Input. Tab never lands on the clear button.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
