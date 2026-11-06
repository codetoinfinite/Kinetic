# Build: Textarea

A React Aria text area that reuses Input's `TextField`, `Label` and `HintText`, so it lines up with an Input in the same form and shares its hover, focus, disabled and invalid states. With `autoResize` it measures its content on every input and grows from `rows` lines up to `maxRows`, then scrolls. Without it, the field rests at `rows` lines with a vertical resize handle. `showCount` adds a counter under the field, as `12/280` when `maxLength` is set.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Multiline sibling of Input on the same filled shell: grows a line at a time up to maxRows, or keeps a resize handle; optional counter.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `Textarea` renders Input's `TextField` (so `TextFieldContext` carries `size` and class overrides), then `Label` when `label` is set, then `TextareaBase`, then a footer row (`flex justify-between gap-3`) with `HintText` and the counter when `hint` or `showCount` is present. Like Input, an unlabelled field falls back to its string `placeholder` for `aria-label`.
2. `TextareaBase` renders `AriaGroup` with the same class logic as Input's shell: `rounded-2lg bg-background-tertiary-default`, a transparent `ring-2 ring-inset`, `ring-border-button-hover` on hover, `ring-border-button-active` on focus within, the disabled and the red invalid fills, all transitioning over `var(--input-transition-ms)`. Inside, `AriaTextArea` has `p-0 px-1` and `text-body-regular`, so the 8px shell plus 4px gives the same 12px text inset as Input.
3. Sizing lives in `fit()`. Without `autoResize` it clears any inline `height`, `maxHeight` and `overflowY`. With it, it reads the computed `line-height` (20px fallback), sets `height` to `0px`, reads `scrollHeight`, then sets `height` to `min(max(scrollHeight, rows × line), maxRows × line)`, sets `maxHeight` to the ceiling and `overflowY` to `auto` only when the content exceeds it. Collapsing to 0 first is what lets the field shrink as text is deleted.
4. `fit` runs from the textarea's `onInput` (for keystrokes in an uncontrolled field, which do not re-render) and from a `useLayoutEffect` with no dependency list, which catches every other change: a controlled parent, a form reset, autofill. Both run before paint, so the height never lags a frame.
5. The counter needs the value, which React Aria's render props do not provide. A controlled field reads `value.length`; an uncontrolled one keeps `typedLength` in state, updated in `onChange` only when `showCount` is on. It renders as `ms-auto text-caption-1-medium text-text-tertiary tabular-nums`, red when invalid. `maxLength` is passed to the `<textarea>`, so the browser enforces it.
6. `resize` maps to `resize-y` (default `vertical`) or `resize-none`, and is forced to `none` while `autoResize` is on, so the handle never fights the measured height.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `rows = 3 (default)`
  The resting height, and also the floor when `autoResize` is on, so an empty composer never collapses to one line.
- `FALLBACK_LINE_HEIGHT = 20`
  The 14/20 line box of `text-body-regular`, used only when the computed `line-height` cannot be parsed (for example before styles resolve).
- `text inset = shell p-2 (8px) + textarea px-1 (4px) = 12px; small px-1.5 gives 10px`
  Exactly Input's inset, so a stacked Input and Textarea share one text edge.
- `--input-transition-ms = 150ms`
  The shell's ring and fill transitions read the same theme variable as Input.

## API

```ts
function Textarea(props: Omit<TextFieldProps, "children"> & { label?: ReactNode; hint?: ReactNode; tooltip?: boolean | string; placeholder?: string; maxLength?: number; showCount?: boolean; rows?: number; autoResize?: boolean; maxRows?: number; resize?: "none" | "vertical"; fieldClassName?: string; ref?: Ref<HTMLTextAreaElement>; groupRef?: Ref<HTMLDivElement> }): JSX.Element
```

- `label: ReactNode`
  Visible label above the field.
- `hint: ReactNode`
  Caption under the field; red while invalid.
- `value / defaultValue / onChange: string / (value: string) => void`
  Controlled or uncontrolled value, from React Aria.
- `rows: number` — default `3`
  Resting height in lines; the floor with `autoResize`.
- `autoResize: boolean` — default `false`
  Grow with the content instead of scrolling at `rows`.
- `maxRows: number`
  Ceiling for `autoResize`; past it the field scrolls.
- `resize: "none" | "vertical"` — default `"vertical"`
  Native resize handle. Ignored while `autoResize` is on.
- `maxLength: number`
  Hard limit enforced by the browser; also the counter's denominator.
- `showCount: boolean` — default `false`
  Shows `count` or `count/maxLength` under the field.
- `isRequired / isInvalid / isDisabled: boolean`
  Same states as Input: asterisk, red shell, grey shell.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Measure from zero so the field shrinks back as well as grows. Reading the
// computed line box keeps the floor and ceiling honest when a consumer
// overrides the type scale through `className`.
const fit = () => {
  const field = innerRef.current;
  if (!field) return;
  if (!autoResize) {
    field.style.height = "";
    field.style.maxHeight = "";
    field.style.overflowY = "";
    return;
  }
  const line =
    parseFloat(window.getComputedStyle(field).lineHeight) || FALLBACK_LINE_HEIGHT;
  const ceiling = maxRows ? maxRows * line : Infinity;
  field.style.height = "0px";
  const next = Math.max(field.scrollHeight, rows * line);
  field.style.height = `${Math.min(next, ceiling)}px`;
  field.style.maxHeight = maxRows ? `${ceiling}px` : "";
  field.style.overflowY = next > ceiling ? "auto" : "hidden";
};

// No dependency list: typing on an uncontrolled field re-renders nothing,
// so `onInput` handles keystrokes and this catches every other reason the
// value moved (a controlled parent, a form reset, an autofill).
useLayoutEffect(fit);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The layout effect only writes inline styles on the textarea and registers no listeners or timers.

**Reduced motion.** The component does not check `prefers-reduced-motion`. The height change is instant, not animated; the only transition is the 150ms ring and fill on the shell, which a global rule that removes transitions makes instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not add vertical padding to the `<textarea>` itself. `fit()` compares `scrollHeight`, which includes padding, against `rows` and `maxRows` times the line height, so padding throws both limits off. Pad the shell instead.
- Do not give the auto-resize `useLayoutEffect` a dependency list. It runs after every render on purpose, so it catches value changes that do not come from typing in this field: a controlled parent, a form reset, autofill.
- Do not expect a resize handle with `autoResize`. It is forced to `resize-none` so a manual drag cannot fight the measured height.

## Notes

- The textarea imports `TextField`, `TextFieldContext`, `Label` and `HintText` from the Input item, so install Input alongside it.
- Textarea has no `errorMessage` prop; while `isInvalid` is set, the `hint` itself turns red and becomes the error message slot.

## Definition of done

An auto-resizing field with `rows={2}` and `maxRows={5}` starts two lines tall. Typing past the end of a line grows it by one line at a time with no visible lag; at five lines it stops growing and scrolls. Deleting text shrinks it back to two lines. The counter under it reads `37/280` and updates on every keystroke. A field without `autoResize` stays at its rows and shows a vertical resize handle. Hover and focus draw the same inset ring as Input.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
