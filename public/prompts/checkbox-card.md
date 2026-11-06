# Build: Checkbox Card

A larger hit target for an on/off choice: a 10px-radius bordered card with a medium-weight title and an optional secondary description, and the same checkbox glyph the plain Checkbox uses, pinned to the trailing edge. The card is the React Aria `Checkbox` label, so clicking the text, the padding or the box all toggle it, and the tick draws itself on exactly as it does in the small control.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Bordered option card with title and description on the left and the kit checkbox on the right; a click anywhere on it toggles.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `CheckboxCard` renders `AriaCheckbox` directly. React Aria makes that a `<label>` wrapping a visually hidden native `<input type="checkbox">`, so the whole card is the click target, Space toggles it when focused, and it takes part in forms and `CheckboxGroup`s like any checkbox. Every Aria prop (`isSelected`, `defaultSelected`, `onChange`, `isDisabled`, `isIndeterminate`, `name`, `value`) passes through.
2. The card class comes from the render-state function: `flex w-full items-center justify-between gap-3 rounded-2lg border border-border-button-default py-3 pe-5 ps-4 select-none`, with `transition-colors duration-150`. When hovered and not disabled the background is `bg-background-primary-hover`, otherwise `bg-background-primary-default`. Disabled adds `cursor-not-allowed opacity-50`.
3. The children render function receives the same state object and lays out a text column (`flex min-w-0 flex-col gap-0.5`) with the title in `text-body-medium text-text-primary` and, when `description` is not null or undefined, a second line in `text-body-regular text-text-secondary`. Both lines `truncate`, so long copy never pushes the box off the card.
4. On the trailing side, `<CheckboxGlyph state={state} />` (wrapped in `shrink-0 py-1`) draws the 16px box: accent gradient and a white tick that draws on over 200ms when selected, a dash when indeterminate, and a focus ring only while `isFocusVisible`. Sharing the glyph is what keeps the card and the plain Checkbox identical.
5. Physical padding is logical (`ps-4 pe-5`), so in RTL the box moves to the left edge and the extra 4px of padding stays on the box side.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `padding = ps-4 pe-5 py-3 (16 / 20 / 12px)`
  Taken from the Figma checkbox item (node 3793:2966). The trailing side is 4px wider so the 16px box sits optically centred in its corner rather than tight against the border.
- `radius = rounded-2lg (10px)`
  The kit's card-level control radius, the same as the gray pill tab and other selectable surfaces, so a stack of option cards matches the inputs around it.
- `hover transition = 150ms transition-colors`
  Only the background changes on hover. 150ms is the kit-wide timing for surface colour changes.

## API

```ts
function CheckboxCard(props: Omit<AriaCheckboxProps, "children"> & { title: ReactNode; description?: ReactNode; ref?: Ref<HTMLLabelElement> }): JSX.Element
```

- `title: ReactNode`
  Main label in body medium. Also the accessible name of the checkbox.
- `description: ReactNode`
  Optional secondary line in body regular, truncated to one line.
- `isSelected / defaultSelected: boolean`
  Controlled or uncontrolled checked state, from React Aria.
- `onChange: (isSelected: boolean) => void`
  Called when the card is toggled.
- `isIndeterminate: boolean`
  Shows the dash instead of the tick.
- `isDisabled: boolean`
  Dims the card to 50%, sets a not-allowed cursor and ignores input.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function CheckboxCard({
  className,
  title,
  description,
  ref,
  ...props
}: CheckboxCardProps) {
  return (
    <AriaCheckbox
      ref={ref}
      {...props}
      className={(state) =>
        cx(
          "group flex w-full items-center justify-between gap-3 rounded-2lg border border-border-button-default py-3 pe-5 ps-4 select-none",
          "transition-colors duration-150 ease",
          state.isHovered && !state.isDisabled
            ? "bg-background-primary-hover"
            : "bg-background-primary-default",
          state.isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {(state) => (
        <>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-body-medium text-text-primary">{title}</span>
            {description !== undefined && description !== null && (
              <span className="truncate text-body-regular text-text-secondary">{description}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center py-1">
            <CheckboxGlyph state={state} />
          </span>
        </>
      )}
    </AriaCheckbox>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The card holds no state, listeners or timers of its own; React Aria owns the checkbox state.

**Reduced motion.** The card itself only fades its background over 150ms. The tick draw animation comes from the shared checkbox glyph, which plays the theme's `animate-check-draw`. The component does not check `prefers-reduced-motion` itself, so remove that animation globally if the tick should appear instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not put a link or a button inside `title` or `description`. The card is a `<label>`, so any click inside it toggles the checkbox, and an interactive child would both fire and toggle.
- Do not wrap the card in your own `<label>` or attach an extra `onClick`. React Aria already makes the whole card the label of the hidden input.
- Do not remove `truncate` from the text spans. Without it a long description wraps unpredictably and pushes the checkbox glyph down off the centre line.
- Do not signal selection with the card border. In this kit the card keeps its neutral border and only the checkbox shows the state.

## Notes

- Put several cards in a React Aria `CheckboxGroup` with `value` props to get a multi-select option list with one shared value array.

## Definition of done

Three stacked cards show a title, a description and a box on the right. Clicking anywhere on a card, including its text, checks it and the white tick draws on. Clicking again clears it. Hovering a card tints its background. Tab focuses each card in turn with a focus ring on the box, and Space toggles it. A disabled card is at half opacity and ignores clicks.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
