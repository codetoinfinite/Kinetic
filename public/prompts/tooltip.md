# Build: Tooltip

A small white card that names or explains its trigger, dressed like the kit's cards and dropdowns: 1px button border, 8px radius, dropdown shadow and primary text. Behaviour is React Aria's `TooltipTrigger` and `Tooltip` (hover and focus open it, Escape closes it, it flips on collision and wires `aria-describedby`), and the surface blurs and scales in over 200ms. The caret is one hand-drawn SVG path per side, not a rotated triangle, so it always meets the body with no gap.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Light-surface tooltip built on React Aria, with a hand-drawn caret per side and a quick blur-and-scale in and out.

- Category: overlay
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `TooltipTrigger` is React Aria's `TooltipTrigger` with `delay` and `closeDelay` both defaulting to 0, so the tooltip opens and starts closing immediately. Its single child must be focusable (a React Aria `Button`, or a plain button wrapped in `Focusable`).
2. `Tooltip` renders `AriaTooltip` with `offset` 10 and `dir` from `useDirection()`. Its className is a function of state so a consumer function className is still honoured, and the surface is `pointer-events-none z-120 max-w-[240px] select-none rounded-lg border border-border-button-default bg-background-primary-default text-text-primary shadow-dropdown`. `pointer-events-none` means moving off the trigger always closes it and the copy cannot be selected by accident.
3. Two size tiers: `sm` is `px-2.5 py-1.5 text-caption-1-medium` (12px), `md` is `px-3 py-2 text-body-medium rounded-2lg` (14px, 10px radius).
4. Motion is one `transition duration-200 ease-out` on scale, filter and opacity, switched off by `motion-reduce:transition-none`. React Aria stamps `data-entering` on mount and removes it, and holds the element while `data-exiting` is set, so `data-[entering]:scale-90 opacity-0 blur-[4px]` and the matching `data-[exiting]` classes play the same transition in and out.
5. With `showArrow` (default true), `OverlayArrow`'s render prop gives the resolved `placement`, which picks an entry in `TOOLTIP_CARETS`: top and bottom are 12x7, left and right are 7x12, each with its own path left open on the edge touching the body (no `Z`) so only the two outer edges are stroked. The SVG is filled `fill-background-primary-default`, stroked `stroke-border-button-default`, and given a `drop-shadow(... rgb(0 0 0 / 0.05))` that falls downward (or past the tip for bottom) to match the body's shadow.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `caret boxes = 12x7 (top, bottom) / 7x12 (left, right)`
  Rotating one 12x7 SVG with CSS changes its visual footprint but not its layout box, so `OverlayArrow` would leave a ~2.5px gap on the left and right sides. A per-side path with the true width and height has no gap.
- `offset = 10px`
  Room for the 7px caret plus a small gap between its tip and the trigger.
- `motion = 200ms ease-out, scale 0.9, blur 4px, opacity 0`
  Fast enough not to delay reading, with the blur hiding the scaled first frames; the same values reverse on exit because React Aria waits on the transition.
- `delay / closeDelay = 0 / 0`
  BoardUI opens and begins closing immediately. A consumer can raise `delay` (the demo toolbar uses 300ms) where tooltips should not fire on a quick sweep.
- `max width = 240px`
  Tooltips hold a label or a short sentence; a cap forces long copy to wrap into a readable block rather than a wide strip.

## API

```ts
function Tooltip(props: Omit<AriaTooltipProps, "children"> & { children?: ReactNode; size?: "sm" | "md"; showArrow?: boolean }): JSX.Element
function TooltipTrigger(props: ComponentProps<typeof AriaTooltipTrigger>): JSX.Element
const TOOLTIP_CARETS: Record<"top" | "bottom" | "left" | "right", { width: number; height: number; path: string; shadow: string }>
```

- `size: "sm" | "md"` — default `"sm"`
  sm is 12px Caption 1 with 10x6 padding; md is 14px Body 1 with 12x8 padding and a 10px radius.
- `showArrow: boolean` — default `true`
  Draw the caret pointing at the trigger.
- `placement: Placement` — default `"top" (React Aria)`
  Preferred side; flips on collision and the caret follows.
- `offset: number` — default `10`
  Distance from the trigger in pixels.
- `TooltipTrigger.delay: number` — default `0`
  Milliseconds of hover before the tooltip opens.
- `TooltipTrigger.closeDelay: number` — default `0`
  Milliseconds before it starts closing after the pointer leaves.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Tooltip({ children, className, size = "sm", showArrow = true, offset = 10, ...props }: TooltipProps) {
  const direction = useDirection();
  return (
    <AriaTooltip
      dir={direction}
      offset={offset}
      {...props}
      className={(state) =>
        cx(
          "pointer-events-none z-120 max-w-[240px] select-none rounded-lg border border-border-button-default bg-background-primary-default text-text-primary shadow-dropdown",
          sizes[size],
          // Blur + scale in/out. react-aria stamps `data-entering` on mount then
          // removes it (transition to base), and holds the element mounted while
          // `data-exiting` is set so the same transition plays in reverse. The
          // `transition` utility covers scale, filter (blur) and opacity. Under
          // reduced motion there is no transition, so the tooltip appears and
          // leaves at once (react-aria finds no running animation to wait for).
          "transition duration-200 ease-out motion-reduce:transition-none",
          "data-[entering]:scale-90 data-[entering]:opacity-0 data-[entering]:blur-[4px]",
          "data-[exiting]:scale-90 data-[exiting]:opacity-0 data-[exiting]:blur-[4px]",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {showArrow && (
        <AriaOverlayArrow>
          {({ placement }) => {
            // `placement` includes react-aria's `"center"` (for other overlay
            // types); this tooltip only ever resolves to one of our 4 sides.
            const caret = TOOLTIP_CARETS[placement as keyof typeof TOOLTIP_CARETS] ?? TOOLTIP_CARETS.top;
            return (
              <svg
                width={caret.width}
                height={caret.height}
                viewBox={`0 0 ${caret.width} ${caret.height}`}
                className="block overflow-visible fill-background-primary-default stroke-border-button-default"
                style={{ filter: `drop-shadow(${caret.shadow} rgb(0 0 0 / 0.05))` }}
              >
                <path d={caret.path} />
              </svg>
            );
          }}
        </AriaOverlayArrow>
      )}
      {children}
    </AriaTooltip>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing of its own. React Aria removes the tooltip after its exit transition and clears its hover and focus timers when the trigger unmounts.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, `motion-reduce:transition-none` removes the 200ms scale, blur and fade: the tooltip appears and leaves at once, and react-aria unmounts it straight away because no animation is running.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not rotate a single caret SVG with `transform` for the left and right sides. Transforms do not affect layout, so the arrow's box stays 12x7 and leaves a visible gap against the body.
- Do not make the tooltip interactive (links, buttons). It is `pointer-events-none` by design; use a Popover for content the reader must click.
- Do not pass a non-focusable trigger. A plain `<button>` must be wrapped in React Aria's `Focusable` (or be a React Aria `Button`) for hover and focus to reach the trigger.
- Do not close the caret path with `Z`. The edge touching the body would get a stroke and draw a line across the join.

## Notes

- `TOOLTIP_CARETS` is exported and reused by Popover so both overlays draw identical arrows.
- The `placement` from `OverlayArrow` can be React Aria's "center" for other overlay types; the lookup falls back to the top caret.

## Definition of done

Hovering or tabbing to "Left" shows a white tooltip to the left of the button with a caret that touches the body with no gap; moving the pointer off closes it with a quick blur-out, and Escape closes it while focused. Each of the four buttons shows its caret pointing back at it. In the toolbar, hovering an icon button for 300ms shows its label in the larger size.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
