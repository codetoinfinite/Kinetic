# Build: Radio Card

The radio counterpart of Checkbox Card: a 10px-radius bordered card with a title, an optional description and the 16px `RadioDot` on the trailing edge. It is a React Aria `Radio`, so it must sit in a `RadioGroup`, which gives single selection and arrow-key movement between cards. Selecting a card cross-fades its dot to the accent gradient while the white centre grows in.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Bordered option card with title, description and the kit radio dot on the right; inside a RadioGroup a click anywhere selects it.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `RadioCard` renders `AriaRadio` directly. React Aria makes it a `<label>` around a visually hidden `<input type="radio">`, so the whole card is the click target and the card reads its selection, focus and disabled state from the surrounding `RadioGroup` context. All Aria radio props (`value`, `isDisabled`, `autoFocus`) pass through.
2. The card class is computed from the render state: `flex w-full items-center justify-between gap-3 rounded-2lg border border-border-button-default py-3 pe-5 ps-4 select-none` with `transition-colors duration-150`. Hovered and not disabled gives `bg-background-primary-hover`, otherwise `bg-background-primary-default`. Disabled adds `cursor-not-allowed opacity-50`.
3. The text column (`flex min-w-0 flex-col gap-0.5`) holds the title in `text-body-medium text-text-primary` and, when `description` is not null or undefined, a line in `text-body-regular text-text-secondary`. Both truncate to one line.
4. The trailing slot (`shrink-0 py-1`) renders `<RadioDot size="md" selected={state.isSelected} focusVisible={state.isFocusVisible} />`, the same glyph `Radio` uses: a bordered white disc and an accent gradient disc cross-fading over 200ms, with a 6px white centre that scales from 0 to 1. The focus ring appears on the dot for keyboard focus only.
5. Because the cards are radios in one group, Tab enters the group once (on the selected card) and the arrow keys move both focus and selection between cards, which is the standard radio pattern.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `padding = ps-4 pe-5 py-3 (16 / 20 / 12px)`
  The Figma checkbox item spec (node 3793:2966), reused so radio and checkbox cards are interchangeable in one settings page. The wider trailing padding gives the dot breathing room in its corner.
- `dot size = RadioDot size="md" (16px, 6px centre)`
  Fixed to medium so the dot matches the 16px checkbox box in Checkbox Card. It is not a prop.
- `radius = rounded-2lg (10px)`
  The kit's radius for card-level controls, shared with Checkbox Card and Switch Card.

## API

```ts
function RadioCard(props: Omit<AriaRadioProps, "children"> & { title: ReactNode; description?: ReactNode; ref?: Ref<HTMLLabelElement> }): JSX.Element
```

- `value: string`
  Value this card contributes to the surrounding `RadioGroup`.
- `title: ReactNode`
  Main label in body medium. Also the accessible name of the radio.
- `description: ReactNode`
  Optional secondary line, truncated to one line.
- `isDisabled: boolean`
  Half opacity, not-allowed cursor, skipped by arrow keys.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function RadioCard({ className, title, description, ref, ...props }: RadioCardProps) {
  return (
    <AriaRadio
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
            <RadioDot size="md" selected={state.isSelected} focusVisible={state.isFocusVisible} />
          </span>
        </>
      )}
    </AriaRadio>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The card holds no state, listeners or timers; the `RadioGroup` owns the value.

**Reduced motion.** The card fades its background over 150ms and the dot cross-fades over 200ms, all as CSS transitions. The component does not check `prefers-reduced-motion`, so a global rule that removes transitions makes the states switch instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not render a `RadioCard` outside a `RadioGroup`. React Aria's `Radio` reads its state from the group context and fails without it.
- Do not put links or buttons inside `title` or `description`. The card is a `<label>`, so clicks inside it select the radio.
- Do not highlight the selected card by changing its border. The kit keeps the border neutral and lets the dot carry the state, which keeps the card the same in both themes.
- Do not forget the group's accessible name (`aria-label` or `aria-labelledby`). React Aria warns about an unnamed radio group.

## Notes

- Use the kit's `RadioGroup` from the Radio item (it is a plain `flex-col gap-2` wrapper around React Aria's group) to stack the cards.

## Definition of done

Three plan cards in a `RadioGroup` show one selected dot. Clicking anywhere on another card, including its description, moves the selection there: the old dot fades back to white and the new one fills with the gradient while its white centre grows in. With a card focused, the arrow keys move the selection between cards. Hover tints a card's background. A disabled card is at half opacity and cannot be selected.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
