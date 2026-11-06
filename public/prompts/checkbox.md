# Build: Checkbox

React Aria's `Checkbox` wrapped around a shared `CheckboxGlyph`: a 16px (or 14px) box with a 4px radius that fills with the accent gradient when checked, while a white tick draws itself on over 200ms. The indeterminate state swaps the tick for a flat dash, which is what a "select all" parent shows when only some of its children are on. The glyph lives in its own file so Checkbox Card renders the identical box.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

React Aria checkbox in two sizes: a gradient box whose white tick draws itself on, plus an indeterminate dash for partial selections.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `Checkbox` spreads every React Aria prop onto `AriaCheckbox`, which renders a `<label>` around the native input (hence `ref?: Ref<HTMLLabelElement>`). Its children are a render function: the state object (`isSelected`, `isIndeterminate`, `isHovered`, `isFocusVisible`, `isDisabled`) goes straight into `<CheckboxGlyph state={state} size={size} />`, and `children`, when not null, becomes a label span in the size's type style.
2. The glyph derives `isMarked = isSelected || isIndeterminate`. Marked boxes paint `bg-linear-to-b from-accent-500 to-accent-600` plus `shadow-checkbox-selected` (the inner highlight), lightening to `from-accent-400 to-accent-500` on hover. Unmarked boxes are a 1px `border-border-checkbox-default` on `bg-background-primary-default` with `shadow-xs`, and the border darkens to `border-border-checkbox-hover` on hover. Hover only counts when the box is not disabled.
3. The box transitions `background-color`, `border-color` and `box-shadow` over 150ms. The gradient itself is a `background-image`, which does not interpolate, so the fill switches at once and the tick carries the motion.
4. Inside a 16×16 `viewBox`, indeterminate wins over selected: it renders the dash `M4.5 8H8H11.5`. A selected box renders the tick path with `pathLength={1}` and `animate-check-draw`. The theme gives that class `stroke-dasharray: 1; stroke-dashoffset: 1` and animates the offset to 0 over 200ms `cubic-bezier(0.65, 0, 0.35, 1)` with `forwards`. Because `pathLength` is 1, the same numbers mean "the whole stroke" at either size.
5. An unchecked box renders no path at all. So every check mounts a fresh path and replays the draw, and unchecking removes the tick immediately with no reverse animation.
6. Sizes come from `checkboxSizes`: md is a `size-4` box, `text-body-medium` label and `gap-2`; sm is a `size-3.5` box, `text-body-2-medium` label and `gap-1.5`. Focus draws `ring-2 ring-border-focus-ring ring-offset-2` only while `isFocusVisible` is true, so it shows for keyboard focus and not for a mouse click. Disabled dims the glyph to `opacity-50` and sets `cursor-not-allowed` on the label. `className` accepts a string or React Aria's state function and is merged last through `cx`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `box size = md 16px (size-4), sm 14px (size-3.5), radius 4px (rounded-sm)`
  Figma's two sizes. Each is paired with its own label style (14px Body 1 for md, 13px Body 2 for sm), so box and text centre on one line.
- `tick draw = 200ms cubic-bezier(0.65, 0, 0.35, 1), forwards`
  A symmetric ease-in-out, so the stroke starts and lands softly like a pen mark. It is short enough to finish before the pointer has moved on. `forwards` holds the final frame, otherwise the tick would vanish when the animation ends.
- `pathLength = 1`
  Normalises the dash arithmetic. A dasharray and offset of 1 mean "the whole path" whatever the rendered size, so one keyframe serves both sizes.
- `stroke = 2px white, round caps and joins`
  The Figma glyph. Round caps keep a 2px stroke from looking clipped inside a 14px box.
- `colour transition = 150ms ease on background-color, border-color, box-shadow`
  The hover border change and the focus ring arrive quickly without looking abrupt.

## API

```ts
function Checkbox(props: Omit<AriaCheckboxProps, "children"> & { children?: ReactNode; size?: "sm" | "md"; ref?: Ref<HTMLLabelElement> }): JSX.Element
function CheckboxGlyph(props: { state: CheckboxGlyphState; size?: CheckboxSize }): JSX.Element
```

- `size: "sm" | "md"` — default `"md"`
  16px box with a 14px label, or 14px box with a 13px label.
- `children: ReactNode`
  The label. Omit it for a bare box, and pass `aria-label` instead.
- `isSelected / defaultSelected: boolean`
  Controlled or uncontrolled checked state (React Aria).
- `onChange: (isSelected: boolean) => void`
  Called with the new checked state.
- `isIndeterminate: boolean`
  Shows the dash instead of the tick. Presentational; the parent clears it.
- `isDisabled: boolean`
  Dims the glyph to 50% and blocks interaction.
- `className: string | ((state) => string)`
  Merged onto the label element after the defaults.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Checkbox({ className, children, size = "md", ref, ...props }: CheckboxProps) {
  const s = checkboxSizes[size];

  return (
    <AriaCheckbox
      ref={ref}
      {...props}
      className={(state) =>
        cx(
          "group inline-flex items-center select-none",
          s.gap,
          state.isDisabled ? "cursor-not-allowed" : "cursor-pointer",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {(state) => (
        <>
          <CheckboxGlyph state={state} size={size} />
          {children !== undefined && children !== null && (
            <span className={cx(s.label, "text-text-primary")}>{children}</span>
          )}
        </>
      )}
    </AriaCheckbox>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to release. There are no effects, listeners or timers, and the tick animation belongs to the SVG path, which unmounts with the component.

**Reduced motion.** The theme's `prefers-reduced-motion: reduce` rule sets `animation: none` and `stroke-dashoffset: 0` on `.animate-check-draw`, so the tick appears whole at once. The 150ms colour and border transition still runs. It changes colour only, nothing moves.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Rendering the tick path all the time and toggling its opacity. The draw is a CSS animation that runs when the path mounts, so it would play once on page load and never again. The glyph returns `null` for an unchecked box for this reason.
- Expecting `isIndeterminate` to clear itself. It is presentational: React Aria keeps showing the dash until the parent stops passing it. A "select all" parent has to compute it from its children on every render (some but not all selected).
- Wrapping `Checkbox` in another `<label>`, or putting a link or button in `children`. `AriaCheckbox` already renders the label, so a nested interactive element toggles the box as well as doing its own job.
- Rendering a bare box (no `children`) without `aria-label`. The box then has no accessible name, and a screen reader announces only "checkbox".

## Notes

- `CheckboxGlyph` takes a plain state object (five booleans), so any component that can supply them can draw the same box. Checkbox Card is the in-kit example.
- Disabled dims only the glyph. The label text keeps full colour, as the Figma states do; pass a `className` if a form needs the whole row dimmed.

## Definition of done

Clicking the label or pressing Space toggles the box. When it is checked, the white tick draws on from left to right over about 200ms on a blue gradient, and an indeterminate box shows a flat white dash instead. With reduced motion the tick appears at once. Tab focus shows a 2px ring offset from the box, and a mouse click does not.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
