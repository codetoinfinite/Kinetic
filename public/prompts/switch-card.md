# Build: Switch Card

The switch counterpart of Checkbox Card: a 12px-radius bordered row with an optional 24px icon, a title, an optional description and the kit `SwitchTrack` on the trailing edge. The whole card is the React Aria `Switch` label, so a click anywhere toggles it and the thumb slides across in 200ms. Size and shape pass straight through to the track.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Bordered settings row with an optional icon, title and description; a click anywhere on the card flips the kit switch on its trailing edge.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `SwitchCard` renders `AriaSwitch` directly. React Aria makes it a `<label>` around a visually hidden `<input type="checkbox" role="switch">`, so the entire card is the hit area and Space toggles it when focused. All Aria switch props (`isSelected`, `defaultSelected`, `onChange`, `isDisabled`, `name`) pass through.
2. The card class is computed from the render state: `group flex w-full items-center justify-between gap-3 rounded-xl border border-border-button-default py-3 pe-5 ps-4 select-none` with `transition-colors duration-150`. Hovered and not disabled gives `bg-background-primary-hover`, otherwise `bg-background-primary-default`. Disabled adds `cursor-not-allowed opacity-50`. A `className` function is called with the same state and merged last.
3. The leading block is `flex min-w-0 items-center gap-3`: the optional `icon` component rendered at `size-6` in `text-foreground-icon-secondary` with `aria-hidden`, then a `flex-col gap-0.5` column with the title in `text-body-medium text-text-primary` and, when `description` is not null or undefined, a line in `text-body-regular text-text-secondary`. Both lines truncate.
4. The trailing slot (`flex shrink-0 items-center`) renders `<SwitchTrack state={state} size={size} shape={shape} />` from the Switch item with the card's own render state, so selection, disabled dimming and the keyboard focus ring all show on the track exactly as on a plain `Switch`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `padding = ps-4 pe-5 py-3 (16 / 20 / 12px)`
  The same chrome as Checkbox Card, so the two can share a settings page. The extra 4px on the trailing side gives the 42px track room from the border.
- `radius = rounded-xl (12px)`
  The one deliberate difference from Checkbox Card, which uses rounded-2lg (10px); the source header calls it out as "mirrors CheckboxCard, but with rounded-xl (12px) corners".
- `hover fade = transition-colors duration-150`
  Same hover fade as Checkbox Card and Radio Card, so every selectable card in the kit tints at one speed. The track itself keeps its own 200ms transition.
- `icon = size-6 (24px), text-foreground-icon-secondary`
  Matches the 24×24 Remix Icon grid. The component takes the icon component itself (`RiMailLine`), not an element, so it controls size and colour.

## API

```ts
function SwitchCard(props: Omit<AriaSwitchProps, "children"> & { title: ReactNode; description?: ReactNode; icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>; size?: "sm" | "md" | "lg"; shape?: "pill" | "rectangle"; ref?: Ref<HTMLLabelElement> }): JSX.Element
```

- `title: ReactNode`
  Main label in body medium. Also the accessible name of the switch.
- `description: ReactNode`
  Optional secondary line, truncated to one line.
- `icon: ComponentType`
  Optional leading 24px icon component, rendered `aria-hidden`.
- `isSelected / defaultSelected: boolean`
  Controlled or uncontrolled on state, from React Aria.
- `onChange: (isSelected: boolean) => void`
  Called when the card is toggled.
- `size: "sm" | "md" | "lg"` — default `"md"`
  Track size, passed to `SwitchTrack`.
- `shape: "pill" | "rectangle"` — default `"pill"`
  Track shape, passed to `SwitchTrack`.
- `isDisabled: boolean`
  Half opacity, not-allowed cursor, ignores input.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function SwitchCard({
  className,
  title,
  description,
  icon: Icon,
  size = "md",
  shape = "pill",
  ref,
  ...props
}: SwitchCardProps) {
  return (
    <AriaSwitch
      ref={ref}
      {...props}
      className={(state) =>
        cx(
          "group flex w-full items-center justify-between gap-3 rounded-xl border border-border-button-default py-3 pe-5 ps-4 select-none",
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
          <span className="flex min-w-0 items-center gap-3">
            {Icon && <Icon className="size-6 shrink-0 text-foreground-icon-secondary" aria-hidden />}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-body-medium text-text-primary">{title}</span>
              {description !== undefined && description !== null && (
                <span className="truncate text-body-regular text-text-secondary">{description}</span>
              )}
            </span>
          </span>
          <span className="flex shrink-0 items-center">
            <SwitchTrack state={state} size={size} shape={shape} />
          </span>
        </>
      )}
    </AriaSwitch>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The card holds no state, listeners or timers of its own; React Aria owns the toggle state.

**Reduced motion.** The component does not check `prefers-reduced-motion`. The 150ms card tint and the 200ms track and thumb are CSS transitions, so a global rule that removes transitions makes them switch instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not pass an element to `icon` (`<RiMailLine />`). It expects the component (`RiMailLine`) and renders it itself.
- Do not put links or buttons in `title` or `description`. The card is a `<label>`, so clicks inside it toggle the switch.
- Do not add a separate `Switch` inside the card. The trailing track is already the visual for this card's own input; a second one would nest two controls.
- Do not give the card a fixed height. The description truncates to one line, but the title and description stack, so a fixed height clips the second line.

## Notes

- The track comes from `registry/ui/switch.tsx` (`SwitchTrack`), so install the Switch item alongside this one.

## Definition of done

A stack of setting cards each shows an icon, a title, a one-line description and a switch on the right. Clicking anywhere on a card, including its description, slides its thumb across and fills the track blue in about 200ms; clicking again reverses it. Hover tints the card. Tab focuses the card and shows the ring on the track; Space toggles it. A disabled card is at half opacity and ignores clicks.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
