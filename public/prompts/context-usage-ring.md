# Build: Context Usage Ring

A compact pill for a chat header or status bar that shows how much of the model's context window is in use. A 16px ring fills clockwise next to the percentage, and the pill moves from neutral to orange to rose as the window fills. Hovering or focusing it opens the kit tooltip with used and total tokens, a stacked bar, a per-source list and a "Free" row.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Small ring and percentage for how full a chat context window is. Turns orange, then rose, near the limit; a tooltip breaks the tokens down.

- Category: display
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `ratio = clamp(used / limit, 0, 1)` and `pct = round(ratio * 100)`. `contextLevel(ratio, warnAt, dangerAt)` returns `"normal"`, `"warning"` (from 0.75) or `"danger"` (from 0.9), and the level picks the pill and arc classes from `LEVEL_STYLE`.
2. The ring is two SVG circles with `pathLength={100}`, rotated -90deg so it starts at 12 o'clock. The track uses the quaternary icon colour. The arc is `strokeDasharray="{pct} 100"`, so the dash length is the percentage with no circumference maths. It is hidden at 0% because a round cap on a zero-length dash still draws a dot.
3. Arc length and colour animate together with `transition-[stroke-dasharray,color] duration-300 ease-out`, and the pill background and text animate with `transition-colors`. A new token count slides the arc forward and crossing a threshold fades the colour.
4. The pill is a React Aria `Button` wrapped in the kit `TooltipTrigger`, so the tooltip opens on hover and on keyboard focus. The button's accessible name is "Context window N% used", and it carries `data-level` for styling and tests.
5. Inside the tooltip, each `breakdown` slice gets a width of `tokens / limit` in a flex bar on the track colour, so the empty tail of the bar is the free space. The list repeats the slices with a dot in the same tone and ends with a "Free" row of `limit - used`. Above the warning threshold a one-line note explains what happens next.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `warnAt / dangerAt = 0.75 / 0.9`
  Orange at three quarters leaves room for a couple of large file reads before the window is full. Rose at 90% is roughly the point where a long reply or one more file forces older turns out.
- `ring size = 16px, stroke 2px (2.5px above 16px)`
  Matches the 16px icons in a status bar. Thicker strokes at that size close up the centre, and thinner ones vanish at 0-10%.
- `tooltip width = 248px, capped at 100vw - 32px`
  Wide enough for a label, a token count and the warning note on two lines. The cap keeps it inside a 360px screen.

## API

```ts
function ContextUsageRing(props: { used: number; limit: number; breakdown?: ContextSlice[]; warnAt?: number; dangerAt?: number; hideLabel?: boolean; size?: number; className?: string }): JSX.Element
interface ContextSlice { label: string; tokens: number; tone?: "accent" | "blue" | "purple" | "orange" | "cyan" | "lime" | "rose" | "yellow" }
function contextLevel(ratio: number, warnAt?: number, dangerAt?: number): "normal" | "warning" | "danger"
function formatTokens(n: number): string
```

- `used: number`
  Tokens currently in the window.
- `limit: number`
  Window size in tokens.
- `breakdown: ContextSlice[]`
  What the used tokens are made of. Shown as a stacked bar and a list in the tooltip; zero slices are skipped.
- `warnAt: number` — default `0.75`
  Share of the window where the pill turns orange.
- `dangerAt: number` — default `0.9`
  Share of the window where the pill turns rose.
- `hideLabel: boolean` — default `false`
  Shows the ring alone. The accessible name still includes the percentage.
- `size: number` — default `16`
  Ring diameter in px.
- `className: string`
  Classes for the pill button.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function Ring({ pct, size, arcClass }: { pct: number; size: number; arcClass: string }) {
  const stroke = size <= 16 ? 2 : 2.5;
  const r = (size - stroke) / 2;
  return (
    <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-foreground-icon-quaternary" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        pathLength={100}
        // A round cap pokes past a zero-length dash, so an empty window draws nothing.
        strokeDasharray={pct > 0 ? `${pct} 100` : "0 100"}
        opacity={pct > 0 ? 1 : 0}
        className={cx(
          "transition-[stroke-dasharray,color] duration-300 ease-out motion-reduce:transition-none",
          arcClass,
        )}
      />
    </svg>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, listeners or observers. React Aria owns the hover, focus and tooltip state.

**Reduced motion.** The arc, its colour and the pill colours use `motion-reduce:transition-none`, so they jump straight to the new value. The tooltip follows the kit's own reduced-motion rule.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `strokeDashoffset` with a computed circumference. `pathLength={100}` lets the dash array be the percentage directly and keeps working at any `size`.
- Drawing the arc at 0% with a round cap. A zero-length dash still renders as a dot, so the arc is hidden until there is at least 1%.
- Putting the tooltip on a plain `<div>`. The kit tooltip needs a focusable React Aria trigger, otherwise keyboard users never see the breakdown.

## Notes

- Slices without a `tone` take accent, purple, cyan, lime and yellow in turn. Orange and rose are left for the warning levels so a slice is never mistaken for the alert colour.
- `formatTokens` prints 812, 4.2k, 114k and 1.2M, and is exported for labels next to the ring.
- The demo is a session header with branch, project and the ring. Its buttons add tokens for a file, a tool run or a message, Compact keeps 20% of messages and drops tool output, and three cards show normal, warning and danger examples with `hideLabel`.

## Definition of done

At 35% the pill is neutral with a third of the ring filled. Adding tokens grows the arc; at 75% the pill turns orange and at 90% rose, each with a note in the tooltip. Hover or Tab onto the pill to see used/limit, a stacked bar, one row per source and a Free row. Compacting brings it back to neutral.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
