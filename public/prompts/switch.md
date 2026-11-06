# Build: Switch

A skeuomorphic on/off switch built on React Aria `Switch`. Off, the track is a flat neutral surface; on, it fills with the accent gradient plus an inset ring and top highlight. The white thumb slides across over 200ms and carries a tiny embossed chip in its centre that turns from white to blue. The visual lives in an exported `SwitchTrack`, so Switch Card renders exactly the same control.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

React Aria toggle with a gradient track, a white thumb that slides 200ms, and an embossed chip that turns blue when on; 3 sizes, 2 shapes.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `Switch` renders `AriaSwitch`, a `<label>` around a visually hidden `<input type="checkbox" role="switch">`, as `group inline-flex items-center gap-2 select-none`. Its children render function passes the state to `<SwitchTrack state={state} size={size} shape={shape} />` and renders `children` (when not null or false) as a `text-body-medium text-text-primary` label. The cursor is `not-allowed` when disabled.
2. Every dimension comes from the `switchSizes` table, keyed by `sm`, `md` and `lg`: track size, track and thumb radius per shape, the on-state shadow, thumb size, the thumb's resting `offset`, its `travel`, and the chip size, border and shadow. `shape` only chooses between the `pill` and `rectangle` radii in each tier.
3. The track is a `relative` `aria-hidden` span with `transition-colors duration-200`. Off: `bg-background-tertiary-default`. On: `bg-linear-to-b from-accent-500 to-accent-600` plus the tier's `onShadow`, an inset white top highlight at 25% and an inset accent-500 hairline ring. At `lg` that shadow is exactly the shared `shadow-checkbox-selected` token; `md` and `sm` scale the highlight to 1.5px and 1px and the ring to 0.75px and 0.5px.
4. The thumb is absolutely positioned at the tier's `offset` (for example `start-[3px] top-[3px]` at md) with a near-white vertical gradient (`from-control-indicator-background from-[43.837%] to-control-indicator-background-subtle`) and a soft contact shadow. When selected it gets the tier's `travel` class (`translate-x-[18px] rtl:-translate-x-[18px]` at md) and `transition-transform duration-200` slides it. Positioning uses the logical `start-*` and the travel flips sign under `rtl:`, so the switch mirrors in RTL.
5. Inside the thumb, the chip is a bottom-to-top gradient (`bg-linear-to-t`) rather than a flipped element, so it stays pixel-snapped and its own drop shadow points down. Off it uses `switch-off-chip-start/end` with a half-opacity button border; on it uses `switch-on-chip-start/end` with an `accent-600` border.
6. Disabled dims only the track (`opacity-50`). Keyboard focus draws `ring-2 ring-border-focus-ring ring-offset-2` on the track while `isFocusVisible` is true.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `track sizes = sm 28×16 · md 42×24 · lg 56×32 px`
  1:1 with the Figma "Toogles" frame (node 3856:3807). Thumb = track height minus twice the padding: 12, 18 and 24px.
- `travel = sm 12px · md 18px · lg 24px`
  Track width minus thumb minus both paddings (28 − 12 − 4, 42 − 18 − 6, 56 − 24 − 8). Any other value leaves the thumb short of, or overlapping, the far edge.
- `duration = 200ms on the track colour and the thumb transform`
  Both run on one clock so the fill and the thumb arrive together. Short enough that a quick double toggle never shows the thumb lagging behind the track colour.
- `thumb gradient stop = from-[43.837%]`
  Copied from the Figma gradient: the top 44% of the thumb is solid white before it falls off to neutral-100, which is what makes it read as a rounded physical knob.

## API

```ts
function Switch(props: Omit<AriaSwitchProps, "children"> & { children?: ReactNode; size?: "sm" | "md" | "lg"; shape?: "pill" | "rectangle"; ref?: Ref<HTMLLabelElement> }): JSX.Element
function SwitchTrack(props: { state: { isSelected: boolean; isDisabled: boolean; isFocusVisible: boolean }; size?: "sm" | "md" | "lg"; shape?: "pill" | "rectangle" }): JSX.Element
```

- `isSelected / defaultSelected: boolean`
  Controlled or uncontrolled on state, from React Aria.
- `onChange: (isSelected: boolean) => void`
  Called when the switch is toggled.
- `size: "sm" | "md" | "lg"` — default `"md"`
  28×16, 42×24 or 56×32 track.
- `shape: "pill" | "rectangle"` — default `"pill"`
  Fully rounded, or a squarer track and thumb with small radii.
- `children: ReactNode`
  Optional label after the track in body medium. Without it, pass `aria-label`.
- `isDisabled: boolean`
  Dims the track to 50% and ignores input.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function SwitchTrack({
  state,
  size = "md",
  shape = "pill",
}: {
  state: SwitchVisualState;
  size?: SwitchSize;
  shape?: SwitchShape;
}) {
  const s = switchSizes[size];

  return (
    <span
      aria-hidden
      className={cx(
        "relative shrink-0 transition-colors duration-200 ease",
        s.track,
        s.trackRadius[shape],
        state.isSelected
          ? cx("bg-linear-to-b from-accent-500 to-accent-600", s.onShadow)
          : "bg-background-tertiary-default",
        state.isDisabled && "opacity-50",
        state.isFocusVisible && "ring-2 ring-border-focus-ring ring-offset-2",
      )}
    >
      {/* Thumb */}
      <span
        className={cx(
          "absolute flex items-center justify-center",
          "bg-linear-to-b from-control-indicator-background from-[43.837%] to-control-indicator-background-subtle",
          "shadow-[0_3px_3px_0_rgb(0_0_0/0.03),0_0.75px_0_0_rgb(0_0_0/0.05)]",
          "transition-transform duration-200 ease",
          s.thumb,
          s.thumbRadius[shape],
          s.offset,
          state.isSelected && s.travel,
        )}
      >
        {/* Embossed inner chip. Gradient runs bottom→top (`to-t`) — equivalent
            to the Figma layer's vertical flip — but WITHOUT a transform, so the
            chip stays pixel-snapped/centred (no blurry 1px shift at sub-pixel
            sizes) and its drop shadow points down instead of up. */}
        <span
          className={cx(
            "border-solid bg-linear-to-t from-[43.837%]",
            s.chip,
            s.chipRadius[shape],
            state.isSelected
              ? "border-accent-600 from-switch-on-chip-start to-switch-on-chip-end"
              : "border-border-button-default/50 from-switch-off-chip-start to-switch-off-chip-end",
          )}
        />
      </span>
    </span>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component holds no state, listeners or timers of its own; React Aria owns the toggle state.

**Reduced motion.** The component does not check `prefers-reduced-motion`. The thumb slide and the track colour change are 200ms CSS transitions, so a global rule that removes transitions makes the thumb jump straight to the other end.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not animate the thumb with `left`. It is placed once with `start-*` and moved with `translate-x`, which stays on the compositor and mirrors with `rtl:-translate-x-*`.
- Do not flip the chip with `rotate-180` or `-scale-y-100` to reverse its gradient. A transform at sub-pixel sizes blurs it and points its shadow upward. Use the reversed gradient direction.
- Do not mix travel values across tiers. Each size's `travel` equals its own track width minus thumb and padding, so changing a track width means recomputing it.
- Do not ship a switch with no label and no `aria-label`. React Aria warns, and screen readers would announce only "switch".

## Notes

- `SwitchTrack` and `switchSizes` are exported, so another control (Switch Card, a menu row) can render the identical visual with its own input.

## Definition of done

An off switch shows a flat grey track with the white thumb at the start. Clicking it, or pressing Space when focused, slides the thumb to the end in about 200ms while the track fills with the blue gradient and the chip in the thumb turns blue. Clicking again reverses both. All three sizes and both shapes keep the thumb inset by the same proportion at both ends. In RTL the thumb starts on the right and slides left. Tab shows a focus ring around the track.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
