# Build: Agent Thinking

The status line an agent shows while it works on a reply. Four indicators share one layout: a 3×3 dot grid with a diagonal wavefront (`wave`), the same grid with a bright head orbiting it (`spin`), five sparkles twinkling in a stagger (`stars`) and a comet lapping a figure-eight (`infinity`). Each sits next to a label with a travelling text shimmer and an optional elapsed-seconds counter, inside a `role="status"` row whose colour comes from one of four tones.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

The "thinking" line above a chat composer: dot wave, dot spin, stars or infinity, with a shimmering label and an elapsed timer.

- Category: display
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The dot variants are driven from JavaScript. Each of the nine cells gets a scalar in [0, 1) along the direction of travel: for `wave` it is `(col + row) / 4` compressed by 3/4, so the front leaves the grid before the phase wraps; for `spin` it is the cell's `atan2` angle around the centre, which is naturally cyclic.
2. A `setInterval` every 80ms advances the phase by 1/8 (one lap per 640ms) and recomputes opacities as a comet: `behind = (phase - s + 1) % 1`, `lit = max(0, 1 - behind / 0.3) ** 1.5`, mapped onto 0.12–1. A 220ms CSS opacity transition on every cell blends the 80ms steps into a glide.
3. `stars` is pure CSS: five 4-point sparkle paths placed at fixed percentages and scales, each running the `bui-agent-thinking-star` keyframes (scale 0 → 1 → 0.8 → 0 with fade) over 1.4s, with `animation-delay` staggered by `i × 1.4 × 0.7 / 5`s.
4. `infinity` draws the figure-eight twice: a 15%-opacity track, and a copy with `pathLength={100}` and `strokeDasharray="11 89"` whose `stroke-dashoffset` animates to -100 every 1.2s, so an 11%-long dash laps the loop at constant speed.
5. The root sets `color` and `--bui-agent-thinking-tone` to the tone colour. The indicators paint with `currentColor`; the label's `.bui-agent-thinking-label` paints a 300%-wide gradient (tone at 55% → 100% → 55%) through `background-clip: text` and slides it with the theme's `ai-chat-text-shimmer` keyframes over 2.6s.
6. `ElapsedTimer` records `performance.now()` on mount and re-renders every 100ms with `elapsed.toFixed(1)` seconds in a tabular mono caption.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `DOTS_GRID / DOTS_SIZE / DOTS_GAP = 3 / 4px / 2px`
  Three 4px cells and two 2px gaps make a 16px square indicator beside the label.
- `DOTS_TICK_MS / DOTS_PHASE_STEP = 80ms / 1/8`
  Eight steps per lap gives a 640ms cycle: lively without reading as a flicker.
- `DOTS_FADE_MS = 220ms`
  Longer than the 80ms tick, so each cell is always mid-transition and the stepped updates read as continuous motion.
- `DOTS_TRAIL / DOTS_MIN_OPACITY = 0.3 / 0.12`
  The tail covers 30% of the lap with a power-1.5 falloff; unlit cells keep 12% so the grid shape never disappears.
- `DOTS_SEED = [0.55, 0.3, 0.15, 0.85, 0.55, 0.3, 1, 0.85, 0.55]`
  A fixed first frame shared by server and client, and the resting state under reduced motion.
- `STAR_PERIOD_S / STAR_SIZE / STAR_COUNT = 1.4s / 14px / 5`
  The box is 21px (1.5 × size); the largest sparkle is 14px and the others are scaled 0.4–0.55 around it.
- `INFINITY_TRAIL / INFINITY_STROKE / INFINITY_DURATION_S = 11 of 100 / 2.75 / 1.2s`
  An 11% dash is long enough to read as a comet but short enough to stay on one lobe of the eight at a time.
- `TONE_COLORS = subtle text-tertiary, default text-secondary, primary text-primary, accent blue-500`
  Every variant defaults to `default` except `stars`, which defaults to `subtle`.

## API

```ts
type AgentThinkingVariant = "wave" | "spin" | "stars" | "infinity"
type AgentThinkingTone = "subtle" | "default" | "primary" | "accent"
function AgentThinking(props: { variant?: AgentThinkingVariant; label?: string; tone?: AgentThinkingTone; shimmer?: boolean; showTimer?: boolean; className?: string }): JSX.Element
```

- `variant: "wave" | "spin" | "stars" | "infinity"` — default `"wave"`
  Which indicator sits before the label.
- `label: string` — default `"Thinking"`
  Status text, e.g. "Searching the docs".
- `tone: "subtle" | "default" | "primary" | "accent"`
  Colour of the indicator and label. Defaults to `default`, or `subtle` for `stars`.
- `shimmer: boolean` — default `true`
  Animated highlight travelling across the label.
- `showTimer: boolean` — default `true`
  Elapsed seconds since mount, shown after the label.
- `className: string`
  Merged onto the root flex row.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * How far along the pattern's travel direction each cell sits, in [0, 1).
 * The wave scalar is compressed below 1 so the phase wrap reads as the front
 * leaving the grid and re-entering; the spin angle is naturally cyclic.
 */
function dotScalar(variant: "wave" | "spin", col: number, row: number) {
  const m = DOTS_GRID - 1;
  if (variant === "wave") {
    return ((col + row) / (2 * m)) * (DOTS_GRID / (DOTS_GRID + 1));
  }
  const center = m / 2;
  return (Math.atan2(row - center, col - center) / (2 * Math.PI) + 1) % 1;
}

function dotOpacities(variant: "wave" | "spin", phase: number) {
  return Array.from({ length: DOTS_GRID * DOTS_GRID }, (_, i) => {
    const s = dotScalar(variant, i % DOTS_GRID, Math.floor(i / DOTS_GRID));
    // Comet: bright head at the phase front, tail fading behind it.
    const behind = (phase - s + 1) % 1;
    const lit = Math.max(0, 1 - behind / DOTS_TRAIL) ** 1.5;
    return DOTS_MIN_OPACITY + (1 - DOTS_MIN_OPACITY) * lit;
  });
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The dot interval and the timer interval are each cleared by their effect cleanup on unmount; the dot interval is also restarted when `variant` changes. The stars and the infinity comet are CSS animations and stop with the element. No global listeners are added.

**Reduced motion.** The dot variants check `prefers-reduced-motion: reduce` on mount and, if it matches, never start their interval, so the grid rests on `DOTS_SEED`. The theme's reduced-motion block removes the label gradient and shows it in the plain tone, stops the comet (leaving the dash still), and shows the stars at 70% opacity instead of frozen at scale 0. The elapsed timer keeps counting, since it is information rather than decoration.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Only the dot variants check `prefers-reduced-motion` in JavaScript, and only on mount. Changing the OS setting while one is mounted does not stop its interval until it remounts or its `variant` changes.
- The timer starts when the component mounts. To restart it for a new request, remount with a new `key`; changing `label` or `variant` keeps counting.
- The root is `role="status"` (a polite live region) and the timer text inside it changes every 100ms. If screen readers in your audience re-announce it, pass `showTimer={false}` or show the time elsewhere.
- The label span carries `aria-label={label}` without a role, so assistive technology reads its text content in practice. Do not rely on the attribute to change what is announced.
- The shimmer paints the label with `color: transparent` and a gradient. A parent that sets `background` on text or overrides `color` with `!important` will hide or flatten it.

## Notes

- The infinity SVG has about 4px of empty viewBox on each side, so it uses `margin: 0 -4px` to keep the label at the same 10px gap as the other variants.
- In light mode the stars are softened to 75% of the tone through `color-mix`; in `.dark` they use the full tone.
- BoardUI's own preview stacks all four variants with timers off, because four clocks in one card is noise.

## Definition of done

With `variant="wave"` a bright band sweeps the 3×3 grid from top-left to bottom-right about every 0.64s, with a fading tail and no cell ever fully invisible. `spin` shows a head circling the grid clockwise. `stars` shows five sparkles popping in and out in a stagger; `infinity` shows a short dash lapping a faint figure-eight every 1.2s. The label shimmers left to right in the same tone as the indicator, and the timer counts up in tenths of a second from 0.0s. Remounting resets it. Under reduced motion nothing moves except the timer.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
