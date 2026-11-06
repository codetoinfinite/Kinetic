# Build: Status Dot

Two nested spans: a 12px round halo in a tinted status colour and a 6px solid dot centred inside it. It is the marker the kit puts in front of a purchase status ("Completed", "Waiting", "Processing") in select options and data-table cells. It is decorative by design, so the text beside it carries the meaning.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A 12px status indicator: a solid 6px dot centred on a tinted halo, in green, yellow and indigo, for selects and table cells.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Keep the colour classes in one `sortCx` map with three keys: `base` (`inline-flex size-3 shrink-0 items-center justify-center rounded-full`), `halo` (one semantic token per colour) and `dot` (one palette class per colour).
2. Render an outer `<span>` with `base` plus `styles.halo[color]`. `size-3` makes it 12px and `shrink-0` stops a flex row (a select option, a table cell) from squeezing the circle into an oval.
3. Render an inner `<span className="size-1.5 rounded-full">` with `styles.dot[color]`: a 6px solid dot, centred by the outer flex box, painted with the plain palette steps `bg-green-500`, `bg-yellow-500` and `bg-indigo-500`.
4. Paint the halo with the semantic tokens `bg-status-dot-{green,yellow,indigo}-halo`. Light maps them to green-100, yellow-200 and indigo-100. Dark maps them to the 800 step mixed to 40% with `transparent`, so only the halo dims while the centre dot stays solid.
5. Set `aria-hidden` on the outer span and spread the remaining props after it, so the dot is skipped by screen readers unless a caller explicitly overrides it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `sizes = halo size-3 (12px), dot size-1.5 (6px)`
  From the Figma status-dropdown dots (node 3731:3266). A 3px ring of halo around the dot is wide enough to read as a glow at body-text size without growing past the 12px icon slot of a select option.
- `light halos = green-100, yellow-200, indigo-100`
  Yellow is one step darker than the other two because yellow-100 nearly vanishes on a white surface.
- `dark halos = color-mix(in srgb, <hue>-800 40%, transparent)`
  A translucent dark halo sits on any dark surface (row hover, selected option) without a visible light disc around the dot.

## API

```ts
interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> { color?: "green" | "yellow" | "indigo"; ref?: Ref<HTMLSpanElement> }
function StatusDot(props: StatusDotProps): JSX.Element
```

- `color: "green" | "yellow" | "indigo"` — default `"green"`
  Picks the halo token and the solid dot colour together.
- `className: string`
  Merged onto the outer halo span through `tailwind-merge`.
- `ref: Ref<HTMLSpanElement>`
  Forwarded to the outer span (React 19 ref-as-prop).

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const styles = sortCx({
  base: "inline-flex size-3 shrink-0 items-center justify-center rounded-full",
  halo: {
    green: "bg-status-dot-green-halo",
    yellow: "bg-status-dot-yellow-halo",
    indigo: "bg-status-dot-indigo-halo",
  },
  dot: {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    indigo: "bg-indigo-500",
  },
});

export function StatusDot({ color = "green", className, ref, ...props }: StatusDotProps) {
  return (
    <span
      ref={ref}
      aria-hidden
      className={cx(styles.base, styles.halo[color], className)}
      {...props}
    >
      <span className={cx("size-1.5 rounded-full", styles.dot[color])} />
    </span>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component is stateless markup with no listeners, timers or effects.

**Reduced motion.** Nothing animates, so the dot renders identically under `prefers-reduced-motion: reduce`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not use the dot as the only signal of a status. It is `aria-hidden`, so always render the status label next to it.
- Do not remove `shrink-0`. In a tight flex row the halo collapses into an ellipse.
- Do not paint the halo with a raw palette class such as `bg-green-100`. The semantic token is what switches to the translucent dark-mode halo.
- Do not add a colour that is not in both maps. `styles.halo[color]` and `styles.dot[color]` are indexed by the same key, and a missing key renders an invisible dot.

## Notes

- Used inside the kit by `select` (option markers) and `data-table` (the purchase-status column).
- Only three colours exist because the source design defines only three status pairs. Add a fourth by adding a halo token to both themes and a key to both maps.

## Definition of done

Each of the three colours renders a 12px circle with a 6px solid dot exactly centred in it. The halo is a pale tint of the dot in light mode and a translucent dark tint in dark mode, while the dot itself keeps the same 500-step colour. The outer span has `aria-hidden`, and the circle stays round inside a narrow flex row.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
