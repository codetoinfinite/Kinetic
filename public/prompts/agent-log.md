# Build: Agent Log

The shared machinery behind BoardUI's Task List and Web Search: a line of agent work drawing itself down the page. `useRevealTicker` paces how many units are visible, `LogRow` blurs each row in as its height opens, softening the clipping edge with an animated mask, and draws its own piece of a curved tree guide so the line reads as one pen stroke. `WorkingRow` is the loose "still going" indicator at the bottom, and `ShimmerText` marks a line in progress. It says nothing about what a row contains; that is the consumer's job.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Streaming agent-log parts: a reveal ticker, rows that blur in under a soft clipping edge, and a curved tree guide that draws itself.

- Category: display
- Runtime cost: dom
- Dependencies: motion@^12.43.0

## How it works

1. `useRevealTicker({ total, stepInterval = 850, startDelay = 320, delayFor, revealed, run, onComplete })` returns how many units to show. Uncontrolled, it schedules one `setTimeout` per step (`startDelay` before the first, `stepInterval` after, or `delayFor(index)` per unit) and clears it on cleanup. Passing `revealed` disables the timer so real events drive the log. `onComplete` fires once per completion, guarded by a ref.
2. `LogRow` is a `motion.li` animating from `UNIT_INITIAL` (`opacity 0, height 0, y 4, blur(6px)`) to `UNIT_ANIMATE` (`opacity 1, height auto, y 0, blur(0px)`). Height runs 0.38s and the rest 0.42s, all on `SOFT_EASE` [0.22, 1, 0.36, 1], so the row has made space just before the text sharpens.
3. Growing from height 0 behind `overflow-hidden` would cut a hard line through the text, so `useRevealMask` applies a `mask-image` gradient whose solid part ends `--bui-reveal-fade` pixels short of the bottom. Motion animates that custom property from 22px to 0 over 0.44s; on `onAnimationComplete` the mask is removed so nothing is composited at rest.
4. `RowConnector` draws the row's piece of the guide: an SVG branch (down the trunk, a 6px quadratic corner at y = 14, out 12px) animating `pathLength` 0 → 1, and, unless the row is last, a 1px trunk below it scaling from its top edge.
5. The pieces run in sequence like one pen: the tail (trunk) of the row above draws for 0.12s, then the new row's branch draws for 0.14s after a 0.12s delay (no delay for the first row). Both are `linear` so the stroke keeps one pace through each junction.
6. `WorkingRow` uses the same blur-in to show `AgentThinking variant="stars"` with a label, off the guide. `GuideBridge` fills the gap between a parent row's glyph and a nested list's trunk. `useLogMotion` reads `prefers-reduced-motion` once for the whole log.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `SOFT_EASE = [0.22, 1, 0.36, 1]`
  Steeply front-loaded, so text has settled by about 0.2s of its 0.42s blur-in.
- `UNIT_TRANSITION = height 0.38s; opacity, filter, y 0.42s; --bui-reveal-fade 0.44s`
  The container settles first, then the words arrive, which reads as smooth rather than as a jump.
- `--bui-reveal-fade = 22px → 0px`
  Longer than a 20px text line, so a growing row is always faintest exactly where it is being clipped.
- `branch geometry = BRANCH_Y 14, BRANCH_RADIUS 6, BRANCH_WIDTH 12`
  The elbow sits at half of the 20px line plus the 4px top padding, fixed from the top, so a wrapped label still branches at its first line.
- `guide timing = tail 0.12s, branch 0.14s after 0.12s, linear`
  Lengths over one pen speed of about 160px/s, so the handoff between pieces is invisible.
- `ticker defaults = startDelay 320ms, stepInterval 850ms`
  A short wait before the first row, then a steady pace that `delayFor` can override per unit.

## API

```ts
function useRevealTicker(options: { total: number; run?: boolean; stepInterval?: number; startDelay?: number; revealed?: number; delayFor?: (index: number) => number; onComplete?: () => void }): number
function LogRow(props: { first: boolean; last: boolean; reduce: boolean; className?: string; children: ReactNode }): JSX.Element
function WorkingRow(props: { label: string; reduce: boolean; className?: string }): JSX.Element
function ShimmerText(props: { children: string }): JSX.Element
function GuideBridge(props: { height: number; offset?: number; reduce: boolean }): JSX.Element
function RowConnector(props: { first: boolean; last: boolean; reduce: boolean }): JSX.Element
function useLogMotion(): boolean
function useRevealMask(reduce: boolean): { style?: CSSProperties; onAnimationComplete: () => void }
```

- `total: number`
  useRevealTicker: how many units the log has.
- `stepInterval / startDelay: number` — default `850 / 320`
  useRevealTicker: wait between units and before the first, in ms.
- `delayFor: (index: number) => number`
  useRevealTicker: per-unit wait; overrides both defaults.
- `revealed: number`
  useRevealTicker: controlled count; disables the internal timer.
- `run: boolean` — default `true`
  useRevealTicker: pause and resume the timer.
- `onComplete: () => void`
  useRevealTicker: fires once when the last unit lands.
- `first / last: boolean`
  LogRow: position in the list; controls the branch delay and whether a trunk is drawn.
- `reduce: boolean`
  LogRow, WorkingRow, GuideBridge: skip the entrance and draw animations (from useLogMotion).
- `label: string`
  WorkingRow: text next to the stars indicator.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Each unit blurs in as it lands: 6px of blur and a 4px lift resolving over
 * 0.42s, the same language the AI Chat thread uses for a streaming line. The
 * height runs a touch shorter on the soft curve so the row has finished making
 * space slightly before the text finishes sharpening — the container settles
 * first, then the words arrive, which is what reads as smooth rather than as a
 * jump.
 *
 * Growing a row from height 0 means `overflow-hidden` cuts a hard line through
 * the text while it emerges. `--bui-reveal-fade` softens that edge: the row is
 * masked with a gradient whose solid portion ends that many pixels short of the
 * bottom, and the reveal animates it to 0, at which point the mask is a no-op
 * and nothing pops. The fade is longer than a text line, so a row is always
 * faintest exactly where it is being clipped.
 */
const REVEAL_FADE_VAR = "--bui-reveal-fade";

// The transparent stop sits just past the box: with both stops at exactly 100%
// the gradient is degenerate and browsers soften the final pixel row, which
// shows up as breaks in the guide where one row meets the next.
const REVEAL_GRADIENT = `linear-gradient(to bottom, #000 calc(100% - var(${REVEAL_FADE_VAR}, 0px)), transparent calc(100% + 1px))`;

const REVEAL_MASK: CSSProperties = {
  WebkitMaskImage: REVEAL_GRADIENT,
  maskImage: REVEAL_GRADIENT,
};

export const UNIT_INITIAL = {
  opacity: 0,
  height: 0,
  y: 4,
  filter: "blur(6px)",
  [REVEAL_FADE_VAR]: "22px",
};

export const UNIT_ANIMATE = {
  opacity: 1,
  height: "auto",
  y: 0,
  filter: "blur(0px)",
  [REVEAL_FADE_VAR]: "0px",
};

export const UNIT_TRANSITION = {
  height: { duration: 0.38, ease: SOFT_EASE },
  opacity: { duration: 0.42, ease: SOFT_EASE },
  filter: { duration: 0.42, ease: SOFT_EASE },
  y: { duration: 0.42, ease: SOFT_EASE },
  [REVEAL_FADE_VAR]: { duration: 0.44, ease: SOFT_EASE },
};

/**
 * The soft edge only earns its keep while a unit is growing. Once the reveal
 * finishes, drop the mask entirely: no compositing layer at rest, and the guide
 * meets pixel-exactly at every row boundary.
 */
export function useRevealMask(reduce: boolean) {
  const [revealing, setRevealing] = useState(!reduce);
  return {
    style: revealing ? REVEAL_MASK : undefined,
    onAnimationComplete: () => setRevealing(false),
  };
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useRevealTicker` clears its pending `setTimeout` whenever the count, options or component change, and on unmount. Motion stops its animations when rows unmount. No global listeners are added.

**Reduced motion.** With `reduce` true, every `initial` is `false`: rows mount at full height and opacity with no blur, the mask is never applied, and the branch and trunk appear fully drawn. The ticker still paces rows, since that is content arriving rather than decoration. `ShimmerText` drops its sweep through the theme's reduced-motion rule.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Give each row content a 4px top padding and a 20px line (the demo uses `py-1` with body text). The branch elbow is fixed at 14px and will not meet the label otherwise.
- Pass `last` correctly: only the final visible row omits its trunk. When a new row arrives the previous one gains its trunk, which is what draws the tail first.
- Keep `delayFor` and `onComplete` stable or cheap. `delayFor` is an effect dependency, so an inline function restarts the pending timer on every render.
- Change the parent's `key` to replay a log. Toggling `run` only pauses and resumes from the current count.
- Do not render a log with motion on the hydration pass if the server cannot know the reduced-motion preference. `initial` differs between the two, so start revealing after mount.

## Notes

- Real agent steps do not take equal time. Drive the log with `revealed` from real events as soon as you have them, or use `delayFor` to dwell on the slow steps.
- `ShimmerText` uses the theme's `.agent-progress-loading-text`: a 3.4s linear gradient sweep through `background-clip: text`, replaced by plain secondary text under reduced motion.
- `agent-log` imports `AgentThinking` for the working row, so installing it brings that item in.

## Definition of done

A log of five steps with the default ticker shows its first row about 320ms after mount, then one row roughly every 850ms (or per `delayFor`). Each row opens its height and sharpens from a 6px blur while lifting 4px, with no hard line cutting the text as it grows. The guide draws as one continuous stroke: the previous row's trunk extends down, then the new row's curved branch draws out to its label. The last row has no trunk hanging below its corner. `onComplete` fires exactly once. With reduced motion, rows appear instantly with the guide already drawn.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
