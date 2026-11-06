# Build: Radio

A `RadioGroup` and `Radio` on React Aria, plus the bare `RadioDot` glyph they draw. The dot is three stacked circles: a bordered white surface, the accent gradient surface on top of it, and a small white centre. Selecting cross-fades the two surfaces over 200ms while the centre scales up from nothing, which gives a gradient fill a smooth transition even though CSS cannot animate gradients.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

React Aria radio group with a gradient selected dot that cross-fades in while the white centre scales up, in two sizes.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `RadioGroup` spreads its props onto `AriaRadioGroup` (single selection, arrow-key roving between radios, form `name` and `value`, label association) and lays the radios out as `flex flex-col gap-2`. `className` accepts a string or React Aria's state function.
2. `Radio` renders `AriaRadio`, a `<label>` around a visually hidden `<input type="radio">`, as `group inline-flex items-center select-none gap-2`. Its children render function passes `isSelected` and `isFocusVisible` to `RadioDot`, then renders `children` (when not null or undefined) in the size's label type in `text-text-primary`. Disabled adds `cursor-not-allowed opacity-50`.
3. `RadioDot` is a `relative rounded-full` span marked `aria-hidden`, sized by `dotStyles[size]`. Layer one is the default surface (`border-border-checkbox-default bg-background-primary-default shadow-xs`). Layer two is the selected surface: `bg-gradient-to-b from-accent-500 to-accent-600` with an inset 1px accent ring and an inset 2px white top highlight at 25% opacity. Only one of them is at full opacity at a time, and both have `transition-opacity duration-200`.
4. Layer three is the inner dot (`bg-control-indicator-background`, white), positioned with `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` rather than flex centring, because fractional sizes such as 5px can land on half pixels under flex. It transitions `scale` and `opacity` over 200ms between `scale-0 opacity-0` and `scale-100 opacity-100`.
5. Focus draws `ring-2 ring-border-focus-ring ring-offset-2` on the dot only while React Aria reports `isFocusVisible`, so a mouse click does not show a ring.
6. `RadioDot` is exported on its own for menu rows that already manage selection (for example a dropdown acting as a radio group). It has no role or focus, so it can sit inside a menu item without nesting one interactive control in another.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `md = size-4 dot (16px), size-1.5 centre (6px), text-body-medium`
  The Figma radio for forms. The 6px centre leaves a 5px gradient ring around it at 16px, which reads as a ring instead of a filled disc.
- `sm = size-3.5 dot (14px), 5px centre, 0.875px border, text-body-2-medium`
  The AI chat model picker (node 4035:6925). Every stroke is scaled by 14/16 (0.875) so the small dot looks like the medium one shrunk, not thinner.
- `crossfade = 200ms opacity on both surfaces, 200ms scale + opacity on the centre`
  Gradient backgrounds cannot transition, so the motion is carried by opacity on stacked layers. All three layers share one duration so the fill and the centre arrive together.
- `selected inset shadow = inset 0 0 0 1px accent-500, inset 0 2px 0 0 rgba(255,255,255,0.25)`
  The first is a crisp edge where a border would shift the layout; the second is the top highlight that matches the primary button's gradient.

## API

```ts
function RadioGroup(props: Omit<AriaRadioGroupProps, "children"> & { children?: ReactNode; ref?: Ref<HTMLDivElement> }): JSX.Element
function Radio(props: Omit<AriaRadioProps, "children"> & { children?: ReactNode; size?: "sm" | "md"; ref?: Ref<HTMLLabelElement> }): JSX.Element
function RadioDot(props: { selected?: boolean; size?: "sm" | "md"; focusVisible?: boolean; className?: string }): JSX.Element
```

- `RadioGroup.value / defaultValue: string`
  Controlled or uncontrolled selected value, from React Aria.
- `RadioGroup.onChange: (value: string) => void`
  Called with the newly selected radio's `value`.
- `RadioGroup.aria-label: string`
  Accessible name when the group has no visible label.
- `Radio.value: string`
  Value this radio contributes to the group.
- `Radio.size: "sm" | "md"` — default `"md"`
  16px dot with body label, or 14px dot with the 13px body-2 label.
- `Radio.isDisabled: boolean`
  Half opacity, not-allowed cursor, skipped by arrow keys.
- `RadioDot.selected: boolean` — default `false`
  Shows the gradient surface and the white centre.
- `RadioDot.size: "sm" | "md"` — default `"sm"`
  Same size table as `Radio`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function RadioDot({ selected = false, size = "sm", focusVisible = false, className }: RadioDotProps) {
  const s = dotStyles[size];
  return (
    <span
      aria-hidden
      className={cx(
        "relative flex shrink-0 items-center justify-center rounded-full",
        s.dot,
        focusVisible && "ring-2 ring-border-focus-ring ring-offset-2",
        className,
      )}
    >
      {/* Default surface */}
      <span
        className={cx(
          "absolute inset-0 rounded-full border-border-checkbox-default bg-background-primary-default shadow-xs",
          "transition-opacity duration-200 ease",
          s.border,
          selected && "opacity-0",
        )}
      />
      {/* Selected gradient surface */}
      <span
        className={cx(
          "absolute inset-0 rounded-full",
          "transition-opacity duration-200 ease",
          s.selected,
          !selected && "opacity-0",
        )}
      />
      {/* Inner dot: absolutely centered (flex centering of fractional sizes can
          land on subpixels) and no drop shadow — a downward shadow makes the
          dot read as sitting below center. */}
      <span
        className={cx(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-control-indicator-background",
          "transition-[scale,opacity] duration-200 ease",
          s.inner,
          selected ? "scale-100 opacity-100" : "scale-0 opacity-0",
        )}
      />
    </span>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component holds no state, listeners or timers of its own; React Aria owns the group state.

**Reduced motion.** The component does not check `prefers-reduced-motion`. The 200ms opacity crossfade and the centre scale are CSS transitions, so a global rule that removes transitions makes the dot switch instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not swap the gradient with a conditional `background-image` on one element. It snaps. The crossfade needs the two surfaces as separate layers.
- Do not centre the inner dot with flexbox. At 5px it can land on a half pixel and look off-centre. Keep the absolute `top-1/2 left-1/2` plus translate.
- Do not give the inner dot a drop shadow. A downward shadow makes it look like it sits below the centre of the ring.
- Do not put a `Radio` inside a menu item. Use `RadioDot`, which is presentational, and let the menu own selection and focus.
- Do not leave `RadioGroup` without a visible `label` or an `aria-label`. React Aria warns about a radio group with no accessible name.

## Notes

- `RadioDot` defaults to `size="sm"` (it is mostly used in compact menus), while `Radio` defaults to `size="md"`.

## Definition of done

Three radios stack vertically with Weekly selected: its dot is a blue gradient with a white centre. Clicking Monthly fades Weekly back to a white bordered circle while Monthly's gradient fades in and its centre grows from nothing, in about 200ms. Arrow keys move the selection within the group. Tab shows a focus ring around the dot, a mouse click does not. The small size renders a slightly smaller dot and label with the same look.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
